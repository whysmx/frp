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
	"fmt"

	"github.com/whysmx/frp/models/config"
	"github.com/whysmx/frp/models/msg"

	"github.com/fatedier/golib/errors"
)

type XtcpProxy struct {
	*BaseProxy
	cfg *config.XtcpProxyConf

	closeCh chan struct{}
}

func (pxy *XtcpProxy) Run() (remoteAddr string, err error) {
	if pxy.rc.NatHoleController == nil {
		pxy.Error("udp port for xtcp is not specified.")
		err = fmt.Errorf("xtcp is not supported in frps")
		return
	}
	sidCh := pxy.rc.NatHoleController.ListenClient(pxy.GetName(), pxy.cfg.Sk)
	go func() {
		for {
			select {
			case <-pxy.closeCh:
				break
			case sidRequest := <-sidCh:
				sr := sidRequest
				workConn, errRet := pxy.GetWorkConnFromPool(nil, nil)
				if errRet != nil {
					continue
				}
				m := &msg.NatHoleSid{
					Sid: sr.Sid,
				}
				errRet = msg.WriteMsg(workConn, m)
				if errRet != nil {
					pxy.Warn("write nat hole sid package error, %v", errRet)
					workConn.Close()
					break
				}

				go func() {
					raw, errRet := msg.ReadMsg(workConn)
					if errRet != nil {
						pxy.Warn("read nat hole client ok package error: %v", errRet)
						workConn.Close()
						return
					}
					if _, ok := raw.(*msg.NatHoleClientDetectOK); !ok {
						pxy.Warn("read nat hole client ok package format error")
						workConn.Close()
						return
					}

					select {
					case sr.NotifyCh <- struct{}{}:
					default:
					}
				}()
			}
		}
	}()
	return
}

func (pxy *XtcpProxy) GetConf() config.ProxyConf {
	return pxy.cfg
}

func (pxy *XtcpProxy) Close() {
	pxy.BaseProxy.Close()
	pxy.rc.NatHoleController.CloseClient(pxy.GetName())
	errors.PanicToError(func() {
		close(pxy.closeCh)
	})
}
