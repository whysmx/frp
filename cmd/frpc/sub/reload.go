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

package sub

import (
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/whysmx/frp/g"
	"github.com/whysmx/frp/models/config"
)

func init() {
	rootCmd.AddCommand(reloadCmd)
}

var reloadCmd = &cobra.Command{
	Use:   "reload",
	Short: "Hot-Reload frpc configuration",
	RunE: func(cmd *cobra.Command, args []string) error {
		iniContent, err := config.GetRenderedConfFromFile(cfgFile)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}

		err = parseClientCommonCfg(CfgFileTypeIni, iniContent)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}

		err = reload()
		if err != nil {
			fmt.Printf("frpc reload error: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("reload success\n")
		return nil
	},
}

func reload() error {
	if g.GlbClientCfg.AdminPort == 0 {
		return fmt.Errorf("admin_port shoud be set if you want to use reload feature")
	}

	req, err := http.NewRequest("GET", "http://"+
		g.GlbClientCfg.AdminAddr+":"+fmt.Sprintf("%d", g.GlbClientCfg.AdminPort)+"/api/reload", nil)
	if err != nil {
		return err
	}

	authStr := "Basic " + base64.StdEncoding.EncodeToString([]byte(g.GlbClientCfg.AdminUser+":"+
		g.GlbClientCfg.AdminPwd))

	req.Header.Add("Authorization", authStr)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		return nil
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	return fmt.Errorf("code [%d], %s", resp.StatusCode, strings.TrimSpace(string(body)))
}
