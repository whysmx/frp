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

package client

import (
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/whysmx/frp/assets"
	"github.com/whysmx/frp/g"
	frpNet "github.com/whysmx/frp/utils/net"

	"github.com/gorilla/mux"
)

var (
	httpServerReadTimeout  = 10 * time.Second
	httpServerWriteTimeout = 10 * time.Second
)

func (svr *Service) RunAdminServer(addr string, port int) (err error) {
	// url router
	router := mux.NewRouter()

	user, passwd := g.GlbClientCfg.AdminUser, g.GlbClientCfg.AdminPwd
	router.Use(frpNet.NewHttpAuthMiddleware(user, passwd).Middleware)

	// api, see dashboard_api.go
	router.HandleFunc("/api/reload", svr.apiReload).Methods("GET")
	router.HandleFunc("/api/status", svr.apiStatus).Methods("GET")
	router.HandleFunc("/api/config", svr.apiGetConfig).Methods("GET")
	router.HandleFunc("/api/config", svr.apiPutConfig).Methods("PUT")

	// view
	router.Handle("/favicon.ico", http.FileServer(assets.FileSystem)).Methods("GET")
	router.PathPrefix("/static/").Handler(frpNet.MakeHttpGzipHandler(http.StripPrefix("/static/", http.FileServer(assets.FileSystem)))).Methods("GET")
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/static/", http.StatusMovedPermanently)
	})

	address := fmt.Sprintf("%s:%d", addr, port)
	server := &http.Server{
		Addr:         address,
		Handler:      router,
		ReadTimeout:  httpServerReadTimeout,
		WriteTimeout: httpServerWriteTimeout,
	}
	if address == "" {
		address = ":http"
	}
	ln, err := net.Listen("tcp", address)
	if err != nil {
		return err
	}

	go server.Serve(ln)
	return
}
