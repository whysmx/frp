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

package client

import (
	"sync"
	"time"

	"github.com/whysmx/frp/models/config"
	"github.com/whysmx/frp/utils/log"
)

type VisitorManager struct {
	ctl *Control

	cfgs     map[string]config.VisitorConf
	visitors map[string]Visitor

	checkInterval time.Duration

	mu sync.Mutex
}

func NewVisitorManager(ctl *Control) *VisitorManager {
	return &VisitorManager{
		ctl:           ctl,
		cfgs:          make(map[string]config.VisitorConf),
		visitors:      make(map[string]Visitor),
		checkInterval: 10 * time.Second,
	}
}

func (vm *VisitorManager) Run() {
	for {
		time.Sleep(vm.checkInterval)
		vm.mu.Lock()
		for _, cfg := range vm.cfgs {
			name := cfg.GetBaseInfo().ProxyName
			if _, exist := vm.visitors[name]; !exist {
				log.Info("try to start visitor [%s]", name)
				vm.startVisitor(cfg)
			}
		}
		vm.mu.Unlock()
	}
}

// Hold lock before calling this function.
func (vm *VisitorManager) startVisitor(cfg config.VisitorConf) (err error) {
	name := cfg.GetBaseInfo().ProxyName
	visitor := NewVisitor(vm.ctl, cfg)
	err = visitor.Run()
	if err != nil {
		visitor.Warn("start error: %v", err)
	} else {
		vm.visitors[name] = visitor
		visitor.Info("start visitor success")
	}
	return
}

func (vm *VisitorManager) Reload(cfgs map[string]config.VisitorConf) {
	vm.mu.Lock()
	defer vm.mu.Unlock()

	delNames := make([]string, 0)
	for name, oldCfg := range vm.cfgs {
		del := false
		cfg, ok := cfgs[name]
		if !ok {
			del = true
		} else {
			if !oldCfg.Compare(cfg) {
				del = true
			}
		}

		if del {
			delNames = append(delNames, name)
			delete(vm.cfgs, name)
			if visitor, ok := vm.visitors[name]; ok {
				visitor.Close()
			}
			delete(vm.visitors, name)
		}
	}
	if len(delNames) > 0 {
		log.Info("visitor removed: %v", delNames)
	}

	addNames := make([]string, 0)
	for name, cfg := range cfgs {
		if _, ok := vm.cfgs[name]; !ok {
			vm.cfgs[name] = cfg
			addNames = append(addNames, name)
			vm.startVisitor(cfg)
		}
	}
	if len(addNames) > 0 {
		log.Info("visitor added: %v", addNames)
	}
	return
}

func (vm *VisitorManager) Close() {
	vm.mu.Lock()
	defer vm.mu.Unlock()
	for _, v := range vm.visitors {
		v.Close()
	}
}
