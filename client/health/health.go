// Copyright 2018 fatedier, fatedier@gmail.com
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

package health

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net"
	"net/http"
	"time"

	"github.com/whysmx/frp/utils/log"
)

var (
	ErrHealthCheckType = errors.New("error health check type")
)

type HealthCheckMonitor struct {
	checkType      string
	interval       time.Duration
	timeout        time.Duration
	maxFailedTimes int

	// For tcp
	addr string

	// For http
	url string

	failedTimes    uint64
	statusOK       bool
	statusNormalFn func()
	statusFailedFn func()

	ctx    context.Context
	cancel context.CancelFunc

	l log.Logger
}

func NewHealthCheckMonitor(checkType string, intervalS int, timeoutS int, maxFailedTimes int, addr string, url string,
	statusNormalFn func(), statusFailedFn func()) *HealthCheckMonitor {

	if intervalS <= 0 {
		intervalS = 10
	}
	if timeoutS <= 0 {
		timeoutS = 3
	}
	if maxFailedTimes <= 0 {
		maxFailedTimes = 1
	}
	ctx, cancel := context.WithCancel(context.Background())
	return &HealthCheckMonitor{
		checkType:      checkType,
		interval:       time.Duration(intervalS) * time.Second,
		timeout:        time.Duration(timeoutS) * time.Second,
		maxFailedTimes: maxFailedTimes,
		addr:           addr,
		url:            url,
		statusOK:       false,
		statusNormalFn: statusNormalFn,
		statusFailedFn: statusFailedFn,
		ctx:            ctx,
		cancel:         cancel,
	}
}

func (monitor *HealthCheckMonitor) SetLogger(l log.Logger) {
	monitor.l = l
}

func (monitor *HealthCheckMonitor) Start() {
	go monitor.checkWorker()
}

func (monitor *HealthCheckMonitor) Stop() {
	monitor.cancel()
}

func (monitor *HealthCheckMonitor) checkWorker() {
	for {
		ctx, cancel := context.WithDeadline(monitor.ctx, time.Now().Add(monitor.timeout))
		err := monitor.doCheck(ctx)

		// check if this monitor has been closed
		select {
		case <-ctx.Done():
			cancel()
			return
		default:
			cancel()
		}

		if err == nil {
			if monitor.l != nil {
				monitor.l.Trace("do one health check success")
			}
			if !monitor.statusOK && monitor.statusNormalFn != nil {
				if monitor.l != nil {
					monitor.l.Info("health check status change to success")
				}
				monitor.statusOK = true
				monitor.statusNormalFn()
			}
		} else {
			if monitor.l != nil {
				monitor.l.Warn("do one health check failed: %v", err)
			}
			monitor.failedTimes++
			if monitor.statusOK && int(monitor.failedTimes) >= monitor.maxFailedTimes && monitor.statusFailedFn != nil {
				if monitor.l != nil {
					monitor.l.Warn("health check status change to failed")
				}
				monitor.statusOK = false
				monitor.statusFailedFn()
			}
		}

		time.Sleep(monitor.interval)
	}
}

func (monitor *HealthCheckMonitor) doCheck(ctx context.Context) error {
	switch monitor.checkType {
	case "tcp":
		return monitor.doTcpCheck(ctx)
	case "http":
		return monitor.doHttpCheck(ctx)
	default:
		return ErrHealthCheckType
	}
}

func (monitor *HealthCheckMonitor) doTcpCheck(ctx context.Context) error {
	// if tcp address is not specified, always return nil
	if monitor.addr == "" {
		return nil
	}

	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", monitor.addr)
	if err != nil {
		return err
	}
	conn.Close()
	return nil
}

func (monitor *HealthCheckMonitor) doHttpCheck(ctx context.Context) error {
	req, err := http.NewRequest("GET", monitor.url, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	io.Copy(ioutil.Discard, resp.Body)

	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("do http health check, StatusCode is [%d] not 2xx", resp.StatusCode)
	}
	return nil
}
