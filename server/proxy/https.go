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
	"strings"

	"github.com/whysmx/frp/g"
	"github.com/whysmx/frp/models/config"
	"github.com/whysmx/frp/utils/util"
	"github.com/whysmx/frp/utils/vhost"
)

type HttpsProxy struct {
	*BaseProxy
	cfg *config.HttpsProxyConf
}

func (pxy *HttpsProxy) Run() (remoteAddr string, err error) {
	routeConfig := &vhost.VhostRouteConfig{}

	addrs := make([]string, 0)
	for _, domain := range pxy.cfg.CustomDomains {
		if domain == "" {
			continue
		}

		routeConfig.Domain = domain
		l, errRet := pxy.rc.VhostHttpsMuxer.Listen(routeConfig)
		if errRet != nil {
			err = errRet
			return
		}
		l.AddLogPrefix(pxy.name)
		pxy.Info("https proxy listen for host [%s]", routeConfig.Domain)
		pxy.listeners = append(pxy.listeners, l)
		addrs = append(addrs, util.CanonicalAddr(routeConfig.Domain, g.GlbServerCfg.VhostHttpsPort))
	}

	if pxy.cfg.SubDomain != "" {
		routeConfig.Domain = pxy.cfg.SubDomain + "." + g.GlbServerCfg.SubDomainHost
		l, errRet := pxy.rc.VhostHttpsMuxer.Listen(routeConfig)
		if errRet != nil {
			err = errRet
			return
		}
		l.AddLogPrefix(pxy.name)
		pxy.Info("https proxy listen for host [%s]", routeConfig.Domain)
		pxy.listeners = append(pxy.listeners, l)
		addrs = append(addrs, util.CanonicalAddr(routeConfig.Domain, int(g.GlbServerCfg.VhostHttpsPort)))
	}

	pxy.startListenHandler(pxy, HandleUserTcpConnection)
	remoteAddr = strings.Join(addrs, ",")
	return
}

func (pxy *HttpsProxy) GetConf() config.ProxyConf {
	return pxy.cfg
}

func (pxy *HttpsProxy) Close() {
	pxy.BaseProxy.Close()
}
