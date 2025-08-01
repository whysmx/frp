// Copyright 2017 fatedier, fatedier@gmail.com
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

package stats

import (
	"time"

	"github.com/whysmx/frp/utils/metric"
)

const (
	ReserveDays = 7
)

type StatsType int

const (
	TypeNewClient StatsType = iota
	TypeCloseClient
	TypeNewProxy
	TypeCloseProxy
	TypeOpenConnection
	TypeCloseConnection
	TypeAddTrafficIn
	TypeAddTrafficOut
)

type ServerStats struct {
	TotalTrafficIn  int64
	TotalTrafficOut int64
	CurConns        int64
	ClientCounts    int64
	ProxyTypeCounts map[string]int64
}

type ProxyStats struct {
	Name            string
	Type            string
	TodayTrafficIn  int64
	TodayTrafficOut int64
	LastStartTime   string
	LastCloseTime   string
	CurConns        int64
}

type ProxyTrafficInfo struct {
	Name       string
	TrafficIn  []int64
	TrafficOut []int64
}

type ProxyStatistics struct {
	Name          string
	ProxyType     string
	TrafficIn     metric.DateCounter
	TrafficOut    metric.DateCounter
	CurConns      metric.Counter
	LastStartTime time.Time
	LastCloseTime time.Time
}

type ServerStatistics struct {
	TotalTrafficIn  metric.DateCounter
	TotalTrafficOut metric.DateCounter
	CurConns        metric.Counter

	// counter for clients
	ClientCounts metric.Counter

	// counter for proxy types
	ProxyTypeCounts map[string]metric.Counter

	// statistics for different proxies
	// key is proxy name
	ProxyStatistics map[string]*ProxyStatistics
}

type Collector interface {
	Mark(statsType StatsType, payload interface{})
	Run() error
	GetServer() *ServerStats
	GetProxiesByType(proxyType string) []*ProxyStats
	GetProxiesByTypeAndName(proxyType string, proxyName string) *ProxyStats
	GetProxyTraffic(name string) *ProxyTrafficInfo
}

type NewClientPayload struct{}

type CloseClientPayload struct{}

type NewProxyPayload struct {
	Name      string
	ProxyType string
}

type CloseProxyPayload struct {
	Name      string
	ProxyType string
}

type OpenConnectionPayload struct {
	ProxyName string
}

type CloseConnectionPayload struct {
	ProxyName string
}

type AddTrafficInPayload struct {
	ProxyName    string
	TrafficBytes int64
}

type AddTrafficOutPayload struct {
	ProxyName    string
	TrafficBytes int64
}
