// Copyright 2019 fatedier, fatedier@gmail.com
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package proxy

import (
	"context"
	"fmt"
	"net"
	"time"

	"github.com/whysmx/frp/g"
	"github.com/whysmx/frp/models/config"
	"github.com/whysmx/frp/models/msg"
	"github.com/whysmx/frp/models/proto/udp"
	"github.com/whysmx/frp/server/stats"

	"github.com/fatedier/golib/errors"
)

type UdpProxy struct {
	*BaseProxy
	cfg *config.UdpProxyConf

	realPort int

	// udpConn is the listener of udp packages
	udpConn *net.UDPConn

	// there are always only one workConn at the same time
	// get another one if it closed
	workConn net.Conn

	// sendCh is used for sending packages to workConn
	sendCh chan *msg.UdpPacket

	// readCh is used for reading packages from workConn
	readCh chan *msg.UdpPacket

	// checkCloseCh is used for watching if workConn is closed
	checkCloseCh chan int

	isClosed bool
}

func (pxy *UdpProxy) Run() (remoteAddr string, err error) {
	pxy.realPort, err = pxy.rc.UdpPortManager.Acquire(pxy.name, pxy.cfg.RemotePort)
	if err != nil {
		return
	}
	defer func() {
		if err != nil {
			pxy.rc.UdpPortManager.Release(pxy.realPort)
		}
	}()

	remoteAddr = fmt.Sprintf(":%d", pxy.realPort)
	pxy.cfg.RemotePort = pxy.realPort
	addr, errRet := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", g.GlbServerCfg.ProxyBindAddr, pxy.realPort))
	if errRet != nil {
		err = errRet
		return
	}
	udpConn, errRet := net.ListenUDP("udp", addr)
	if errRet != nil {
		err = errRet
		pxy.Warn("listen udp port error: %v", err)
		return
	}
	pxy.Info("udp proxy listen port [%d]", pxy.cfg.RemotePort)

	pxy.udpConn = udpConn
	pxy.sendCh = make(chan *msg.UdpPacket, 1024)
	pxy.readCh = make(chan *msg.UdpPacket, 1024)
	pxy.checkCloseCh = make(chan int)

	// read message from workConn, if it returns any error, notify proxy to start a new workConn
	workConnReaderFn := func(conn net.Conn) {
		for {
			var (
				rawMsg msg.Message
				errRet error
			)
			pxy.Trace("loop waiting message from udp workConn")
			// client will send heartbeat in workConn for keeping alive
			conn.SetReadDeadline(time.Now().Add(time.Duration(60) * time.Second))
			if rawMsg, errRet = msg.ReadMsg(conn); errRet != nil {
				pxy.Warn("read from workConn for udp error: %v", errRet)
				conn.Close()
				// notify proxy to start a new work connection
				// ignore error here, it means the proxy is closed
				errors.PanicToError(func() {
					pxy.checkCloseCh <- 1
				})
				return
			}
			conn.SetReadDeadline(time.Time{})
			switch m := rawMsg.(type) {
			case *msg.Ping:
				pxy.Trace("udp work conn get ping message")
				continue
			case *msg.UdpPacket:
				if errRet := errors.PanicToError(func() {
					pxy.Trace("get udp message from workConn: %s", m.Content)
					pxy.readCh <- m
					pxy.statsCollector.Mark(stats.TypeAddTrafficOut, &stats.AddTrafficOutPayload{
						ProxyName:    pxy.GetName(),
						TrafficBytes: int64(len(m.Content)),
					})
				}); errRet != nil {
					conn.Close()
					pxy.Info("reader goroutine for udp work connection closed")
					return
				}
			}
		}
	}

	// send message to workConn
	workConnSenderFn := func(conn net.Conn, ctx context.Context) {
		var errRet error
		for {
			select {
			case udpMsg, ok := <-pxy.sendCh:
				if !ok {
					pxy.Info("sender goroutine for udp work connection closed")
					return
				}
				if errRet = msg.WriteMsg(conn, udpMsg); errRet != nil {
					pxy.Info("sender goroutine for udp work connection closed: %v", errRet)
					conn.Close()
					return
				} else {
					pxy.Trace("send message to udp workConn: %s", udpMsg.Content)
					pxy.statsCollector.Mark(stats.TypeAddTrafficIn, &stats.AddTrafficInPayload{
						ProxyName:    pxy.GetName(),
						TrafficBytes: int64(len(udpMsg.Content)),
					})
					continue
				}
			case <-ctx.Done():
				pxy.Info("sender goroutine for udp work connection closed")
				return
			}
		}
	}

	go func() {
		// Sleep a while for waiting control send the NewProxyResp to client.
		time.Sleep(500 * time.Millisecond)
		for {
			workConn, err := pxy.GetWorkConnFromPool(nil, nil)
			if err != nil {
				time.Sleep(1 * time.Second)
				// check if proxy is closed
				select {
				case _, ok := <-pxy.checkCloseCh:
					if !ok {
						return
					}
				default:
				}
				continue
			}
			// close the old workConn and replac it with a new one
			if pxy.workConn != nil {
				pxy.workConn.Close()
			}
			pxy.workConn = workConn
			ctx, cancel := context.WithCancel(context.Background())
			go workConnReaderFn(workConn)
			go workConnSenderFn(workConn, ctx)
			_, ok := <-pxy.checkCloseCh
			cancel()
			if !ok {
				return
			}
		}
	}()

	// Read from user connections and send wrapped udp message to sendCh (forwarded by workConn).
	// Client will transfor udp message to local udp service and waiting for response for a while.
	// Response will be wrapped to be forwarded by work connection to server.
	// Close readCh and sendCh at the end.
	go func() {
		udp.ForwardUserConn(udpConn, pxy.readCh, pxy.sendCh)
		pxy.Close()
	}()
	return remoteAddr, nil
}

func (pxy *UdpProxy) GetConf() config.ProxyConf {
	return pxy.cfg
}

func (pxy *UdpProxy) Close() {
	pxy.mu.Lock()
	defer pxy.mu.Unlock()
	if !pxy.isClosed {
		pxy.isClosed = true

		pxy.BaseProxy.Close()
		if pxy.workConn != nil {
			pxy.workConn.Close()
		}
		pxy.udpConn.Close()

		// all channels only closed here
		close(pxy.checkCloseCh)
		close(pxy.readCh)
		close(pxy.sendCh)
	}
	pxy.rc.UdpPortManager.Release(pxy.realPort)
}
