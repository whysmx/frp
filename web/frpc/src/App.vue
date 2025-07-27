<template>
    <div id="app">
        <header class="grid-content header-color">
            <el-row>
                <a class="brand" href="#">frp client</a>
            </el-row>
        </header>
        <section>
            <el-row :gutter="20">
                <el-col id="side-nav" :xs="24" :md="4">
                    <el-menu default-active="1" mode="vertical" theme="light" router="true" @select="handleSelect">
                        <el-menu-item index="/">Overview</el-menu-item>
                        <el-menu-item index="/configure">Configure</el-menu-item>
                        <el-menu-item index="/sites">Site Manager</el-menu-item>
                        <el-menu-item index="">Help</el-menu-item>
                    </el-menu>
				</el-col>

				<el-col :xs="24" :md="20">
                    <div id="content">
                    <router-view></router-view>
                    </div>
				</el-col>
		</el-row>
	</section>
	<footer></footer>
</div>
</template>

<script>
    export default {
        methods: {
            handleSelect(key, path) {
                if (key == '') {
                    window.open("https://github.com/fatedier/frp")
                }
            }
        }
    }
</script>

<style>
    body {
        background-color: #fafafa;
        margin: 0px;
        font-family: -apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif;
    }
    
    header {
        width: 100%;
        height: 60px;
    }
    
    .header-color {
        background: #58B7FF;
    }
    
    #content {
        margin-top: 20px;
        padding-right: 40px;
    }
    
    .brand {
        color: #fff;
        background-color: transparent;
        margin-left: 20px;
        float: left;
        line-height: 25px;
        font-size: 25px;
        padding: 15px 15px;
        height: 30px;
        text-decoration: none;
    }
    
    /* Global styles for site management */
    #side-nav .el-menu-item {
        transition: all 0.3s ease;
    }
    
    #side-nav .el-menu-item:hover {
        background-color: #ecf5ff;
        color: #409EFF;
    }
    
    #side-nav .el-menu-item.is-active {
        background-color: #409EFF;
        color: white;
        border-right: 3px solid #409EFF;
    }
    
    /* Improve content area spacing */
    #content {
        min-height: calc(100vh - 100px);
    }
    
    /* Global loading improvements */
    .el-loading-mask {
        background-color: rgba(255, 255, 255, 0.9);
    }
    
    /* Message positioning */
    .el-message {
        top: 80px !important;
    }
    
    /* Responsive navigation */
    @media (max-width: 768px) {
        #side-nav {
            margin-bottom: 20px;
        }
        
        #side-nav .el-menu {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
        }
        
        #side-nav .el-menu-item {
            flex-shrink: 0;
            text-align: center;
            min-width: 100px;
        }
        
        #content {
            padding-right: 20px;
        }
    }
</style>
