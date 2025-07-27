import Vue from 'vue'
// import ElementUI from 'element-ui'
import {
    Button,
    Form,
    FormItem,
    Row,
    Col,
    Table,
    TableColumn,
    Menu,
    MenuItem,
    MessageBox,
    Message,
    Input,
    InputNumber,
    Select,
    Option,
    Tag,
    Card,
    Dialog,
    Alert,
    Progress,
    Tooltip,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    RadioGroup,
    RadioButton,
    Collapse,
    CollapseItem,
    Loading
} from 'element-ui'
import lang from 'element-ui/lib/locale/lang/en'
import locale from 'element-ui/lib/locale'
import 'element-ui/lib/theme-chalk/index.css'
import './utils/less/custom.less'

// Import global styles for site management
import './assets/styles/global.css'

import App from './App.vue'
import router from './router'
import 'whatwg-fetch'

locale.use(lang)

Vue.use(Button)
Vue.use(Form)
Vue.use(FormItem)
Vue.use(Row)
Vue.use(Col)
Vue.use(Table)
Vue.use(TableColumn)
Vue.use(Menu)
Vue.use(MenuItem)
Vue.use(Input)
Vue.use(InputNumber)
Vue.use(Select)
Vue.use(Option)
Vue.use(Tag)
Vue.use(Card)
Vue.use(Dialog)
Vue.use(Alert)
Vue.use(Progress)
Vue.use(Tooltip)
Vue.use(Dropdown)
Vue.use(DropdownMenu)
Vue.use(DropdownItem)
Vue.use(RadioGroup)
Vue.use(RadioButton)
Vue.use(Collapse)
Vue.use(CollapseItem)
Vue.use(Loading.directive)

Vue.prototype.$msgbox = MessageBox;
Vue.prototype.$confirm = MessageBox.confirm
Vue.prototype.$message = Message
Vue.prototype.$loading = Loading.service

//Vue.use(ElementUI)

Vue.config.productionTip = false

new Vue({
    el: '#app',
    router,
    template: '<App/>',
    components: { App }
})
