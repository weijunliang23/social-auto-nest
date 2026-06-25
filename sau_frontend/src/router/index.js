import { createRouter, createWebHashHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import AccountManagement from "../views/AccountManagement.vue";
import MaterialManagement from "../views/MaterialManagement.vue";
import PublishCenter from "../views/PublishCenter.vue";
import PublishRecord from "../views/PublishRecord.vue";
import About from "../views/About.vue";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import XhsLayout from "../views/xiaohongshu/XhsLayout.vue";
import XhsDashboard from "../views/xiaohongshu/XhsDashboard.vue";
import XhsLogin from "../views/xiaohongshu/XhsLogin.vue";
import XhsFeeds from "../views/xiaohongshu/XhsFeeds.vue";
import XhsFeedDetail from "../views/xiaohongshu/XhsFeedDetail.vue";
import XhsSearch from "../views/xiaohongshu/XhsSearch.vue";
import XhsProfile from "../views/xiaohongshu/XhsProfile.vue";
import XhsPlaceholder from "../views/xiaohongshu/XhsPlaceholder.vue";
import { isAuthenticated } from "../utils/auth";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { public: true },
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
    meta: { public: true },
  },
  {
    path: "/",
    name: "Dashboard",
    component: Dashboard,
  },
  {
    path: "/account-management",
    name: "AccountManagement",
    component: AccountManagement,
  },
  {
    path: "/material-management",
    name: "MaterialManagement",
    component: MaterialManagement,
  },
  {
    path: "/publish-center",
    name: "PublishCenter",
    component: PublishCenter,
  },
  {
    path: "/publish-records",
    name: "PublishRecord",
    component: PublishRecord,
  },
  {
    path: "/about",
    name: "About",
    component: About,
  },
  {
    path: "/xiaohongshu",
    component: XhsLayout,
    redirect: "/xiaohongshu/dashboard",
    children: [
      {
        path: "dashboard",
        name: "XhsDashboard",
        component: XhsDashboard,
        meta: { title: "总览" },
      },
      {
        path: "login",
        name: "XhsLogin",
        component: XhsLogin,
        meta: { title: "登录与状态" },
      },
      {
        path: "publish",
        name: "XhsPublish",
        component: XhsPlaceholder,
        props: { title: "内容发布" },
        meta: { title: "内容发布" },
      },
      {
        path: "feeds",
        name: "XhsFeeds",
        component: XhsFeeds,
        meta: { title: "推荐列表" },
      },
      {
        path: "search",
        name: "XhsSearch",
        component: XhsSearch,
        meta: { title: "内容搜索" },
      },
      {
        path: "feed-detail",
        name: "XhsFeedDetail",
        component: XhsFeedDetail,
        meta: { title: "帖子详情与评论" },
      },
      {
        path: "profile",
        name: "XhsProfile",
        component: XhsProfile,
        meta: { title: "用户主页" },
      },
      {
        path: "card-factory",
        name: "XhsCardFactory",
        component: XhsPlaceholder,
        props: { title: "内容工厂 · 卡片" },
        meta: { title: "内容工厂 · 卡片" },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const isPublic = to.meta.public === true;
  const loggedIn = isAuthenticated();

  if (!loggedIn && !isPublic) {
    next({ path: "/login", query: { redirect: to.fullPath } });
    return;
  }

  if (loggedIn && (to.path === "/login" || to.path === "/register")) {
    next("/");
    return;
  }

  next();
});

export default router;
