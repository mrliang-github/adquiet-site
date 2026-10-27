---
title: "Vercel 项目用 Cloudflare 加速国内访问"
publishDate: "2026-05-28"
description: "从 DNS、域名验证到代理与缓存，记录小项目接入 Cloudflare 的顺序和限制。实际访问效果仍要按网络和业务测试。"
tags: ["独立站","Vercel","Cloudflare"]
sourcePlatform: "微信公众号"
source: "2026-05-28-Vercel项目用Cloudflare加速国内访问.md"
---

![Vercel 项目用 Cloudflare 加速国内访问首图](https://img.liangxiaoaitool.top/2026/05/gzh-illust-00-cover-vercel-cloudflare-1080-v3.png)

我最近做一些网站和小工具时，经常遇到一个很现实的问题：项目部署在 Vercel 上，海外访问还可以，但国内朋友一打开就很玄学。

有时候能打开，只是慢一点。

有时候刷新几次才出来。

还有时候干脆打不开。

如果这是一个正式面向国内用户长期运营的项目，认真方案其实很明确：

```text
国内服务器
+
ICP备案
+
国内 CDN
```

这条路更稳，也更符合长期运营的要求。

但很多小项目还没走到这一步。

比如一个 MVP、一个 AI 小工具、一个展示页、一个刚做出来想让朋友试试的产品。这个阶段直接买国内服务器、备案、接 CDN，流程有点重，时间也不一定划算。

所以我会先用一个更轻的方案，给部署在 Vercel 上的项目做一层国内访问加速：

```text
Vercel 部署项目
+
Cloudflare 托管 DNS
+
Cloudflare 代理和缓存
```

这篇就讲这个配置怎么做。

它不追求国内极速。我更关心一个现实目标：

```text
让国内用户先能打开，能体验，能给反馈。
```

## 先说清楚：这里的加速是过渡方案

这套方案一定要先把边界讲清楚。

它仍然是海外部署链路。

你的项目还是跑在 Vercel 上，Cloudflare 只是站在用户和 Vercel 中间，帮你做 DNS、HTTPS、代理、部分静态资源缓存和基础防护。

访问链路大概是这样：

```text
国内用户
  ↓
你的自定义域名
  ↓
Cloudflare
  ↓
Vercel
  ↓
你的网站
```

所以它不能替代国内服务器，也不能替代备案，更不能直接等同于大陆 CDN。

Cloudflare 自己有面向中国大陆的 China Network，背后是和国内合作伙伴一起做的网络服务。普通免费账号里打开一个橙色云朵，和那套中国大陆网络服务不是一回事。

我会把它定位成：

```text
小项目早期的低成本国内访问加速方案
```

先把产品跑起来，先拿到真实用户反馈。后面如果确实有人用，再决定要不要迁到香港服务器、国内云、国内 CDN，或者补备案。

这里还有一个细节：Vercel 官方其实不建议在 Vercel 前面再套外部反向代理，比如 Cloudflare。原因也很现实：Vercel 对流量的可见性会变差，安全能力会受影响，缓存也会多一层，排查问题更麻烦。

我看这个建议是合理的。

所以我的用法也很克制：只在小项目早期、展示页、工具站、低风险页面上用。真到稳定运营阶段，就不要拿这个当架构答案。

## 它到底能解决什么

我自己会用这套方案，主要是因为它能解决一些早期项目的“可访问性”问题。

不是每一次都会明显变快，但它至少给你多了一层可以控制的入口。

大概可以这样判断：

| 问题 | 这套方案的作用 |
| --- | --- |
| Vercel 默认域名国内访问不稳定 | 有机会改善，但要实测 |
| 自定义域名想统一管理 DNS | 适合交给 Cloudflare |
| 静态资源加载慢 | 可以靠 Cloudflare 缓存改善一部分 |
| 登录、上传、后台、API 很重 | 不建议乱缓存，效果也不稳定 |
| 正式国内商用访问 | 这套不够，需要更认真方案 |
| 想要真正大陆 CDN | 普通 Cloudflare 代理不等于大陆 CDN |

这也是很多独立开发项目早期的真实状态。

你还不知道这个产品有没有人用，就先把基础设施做到很重，容易把时间花在不该花的地方。

我的习惯是：先跑起来。只要访问体验没有明显挡住用户，就先验证产品本身。

## 第一步：先确认 Vercel 项目本身可访问

不要一上来就折腾域名和 DNS。

先确认项目在 Vercel 上已经部署成功，比如能通过默认域名打开：

```text
your-project.vercel.app
```

这一步看起来很简单，但很重要。

很多时候页面打不开，真正原因可能在项目本身：构建失败、环境变量没配、接口报错，或者 Vercel 上的 Production 还没部署成功。

先把 Vercel 默认域名跑通，再做后面的域名接入。



![Vercel 默认域名部署成功截图](https://img.liangxiaoaitool.top/2026/05/20260527182410606.png)

## 第二步：把域名 DNS 交给 Cloudflare 管

域名在哪里买都可以。

Spaceship、Namecheap、阿里云、腾讯云，都不影响这个方案。

关键动作是：把域名的 Nameserver 改成 Cloudflare 给你的两个 Nameserver。

改完之后，可以理解成这样：

```text
域名仍然在原注册商续费
DNS 解析交给 Cloudflare 管
```

以后你添加 `www`、`app`、`api` 这种子域名，或者切换灰云、橙云，基本都在 Cloudflare 里操作。

这个阶段不用急着开代理，先让 Cloudflare 接管 DNS 管理权。



![Cloudflare Nameserver 配置截图](https://img.liangxiaoaitool.top/2026/05/20260527182320118.png)

Nameserver 修改后，生效时间不一定一样。有的几分钟，有的要更久。不要刚改完就连续乱删记录，先等它稳定。

## 第三步：在 Vercel 添加自定义域名

接下来进入 Vercel 项目：

```text
Project -> Settings -> Domains
```

把你要绑定的域名加进去。

比如：

```text
example.com
www.example.com
app.example.com
```

如果你同时添加根域名和 `www`，记得选一个作为主域名，另一个做跳转。否则搜索引擎和用户都会看到两个入口，后面做 SEO 会有点乱。



![Vercel Domains 页面截图](https://img.liangxiaoaitool.top/2026/05/20260527182336334.png)

这里我踩过的坑是：不要背固定答案。

网上很多文章会写：

```text
A 记录填 76.76.21.21
CNAME 填 cname.vercel-dns.com
```

这些可以当参考，但不要当死规则。

Vercel 当前页面会给你更准确的配置。你只需要看三个字段：

```text
Type
Name
Value
```

它让你填 A 记录，你就填 A 记录。

它让你填 CNAME，你就填 CNAME。

如果它额外要求 TXT 验证，也按页面提示加。

我现在的习惯是以 Vercel 控制台当前提示为准，不靠记忆配置 DNS。

## 第四步：Cloudflare 里先用灰云

到 Cloudflare 的 DNS 页面，把 Vercel 要求的记录填进去。

比如 Vercel 提示：

```text
Type: CNAME
Name: www
Value: xxx.vercel-dns.com
```

那 Cloudflare 里就填：

```text
类型：CNAME
名称：www
内容：xxx.vercel-dns.com
```

这里有一个很关键的动作：

```text
先用灰云
```

Cloudflare DNS 记录旁边有一个云朵图标。

灰色云朵表示：

```text
DNS only
```

也就是只做 DNS 解析，不让流量经过 Cloudflare 代理。

橙色云朵表示：

```text
Proxied
```

也就是用户访问会先经过 Cloudflare，再转到 Vercel。

我建议刚开始一定先灰云。

原因很简单：很多第三方平台做域名验证时，需要直接看到你填的 CNAME 或 TXT 记录。如果你一开始就开橙云，第三方看到的可能是 Cloudflare 的代理结果，验证就容易失败。

等 Vercel 显示域名配置正常、SSL 证书也正常，再切橙云测试。

## 第五步：切橙云后，先检查 SSL

等 Vercel 那边验证通过，网站也能通过自定义域名打开，再回到 Cloudflare，把对应的 Web 访问记录切成橙云。

这时候链路就变成：

```text
用户 -> Cloudflare -> Vercel
```



![Cloudflare 灰云橙云切换截图](https://img.liangxiaoaitool.top/2026/05/20260527182507441.png)

切完以后，Cloudflare 里的 SSL/TLS 模式要注意。

不要用 `Flexible`。

如果 Cloudflare 对用户用 HTTPS，但回源到 Vercel 时用 HTTP，就很容易出现重定向循环。Vercel 官方也专门提到过这个问题。

更稳的设置是：

```text
SSL/TLS -> Full
```

然后打开你的域名测试：

```text
https://example.com
https://www.example.com
```

如果出现反复跳转、证书错误、页面打不开，先不要继续加缓存规则。把橙云改回灰云，确认是不是代理层导致的问题。

Vercel 后台如果出现 `Proxy Detected` 这类提示，也不用立刻紧张。

它只是提醒你前面多了一层代理。这个提示本身不等于网站坏了，但它也在提醒你：现在排查问题会多一层。

## 第六步：缓存先保守一点

Cloudflare 的缓存能力很好用，但不要一上来就开全站缓存。

尤其是 Next.js、SaaS 工具、AI 工具站，很容易同时有静态页面、动态接口、登录状态和上传功能。

如果你随手把所有东西都缓存，后面可能出现这些问题：

```text
用户看到旧页面
接口结果不更新
登录状态异常
上传后页面还是旧数据
发布新版本后资源没刷新
```

我的建议是先保持默认缓存策略。

Cloudflare 默认会更偏向处理图片、CSS、JS、字体这类静态资源。动态 HTML 默认不会直接缓存，除非你额外配置 Cache Rules。

如果你确实要加规则，可以从这些地方开始：

```text
/_next/static/*
*.css
*.js
*.png
*.jpg
*.webp
*.woff2
```

这些路径通常更适合缓存。

但下面这些路径我会先绕开：

```text
/api/*
/admin/*
/login
/checkout
/upload
用户后台页面
```

小项目早期，缓存规则宁可少一点。

先让网站正常，再慢慢优化速度。不要为了看起来专业，把问题搞复杂。

## 我会怎么验收

配置完以后，我不会只在自己电脑浏览器里打开一下就结束。

至少做几件事：

```text
1. Vercel Domains 显示域名已验证
2. Cloudflare DNS 记录状态符合预期
3. 电脑浏览器能打开
4. 手机 4G/5G 能打开
5. 换一个网络再打开一次
6. 如果有 API、上传、登录，就把关键流程走一遍
```

如果只是展示页，看首页、二级页面、图片、字体、跳转就够了。

如果是工具站，就一定要测核心功能。

比如 AI 工具要测试生成，上传工具要测试文件上传，后台系统要测试登录和数据读取。

很多部署问题会藏在首页后面：首页能打开，真正的功能跑不通。

## 哪些项目适合这样做

我觉得它适合这些场景：

```text
个人项目
工具站
展示页
SaaS MVP
AI 小工具
临时活动页
早期验证项目
```

尤其是那种你刚做出来，还没确定有没有人用的东西。

这时候更应该降低验证成本，别急着把基础设施一次性搭满。

但如果是下面这些场景，我会谨慎很多：

```text
正式商用项目
强依赖国内访问速度
有付费交易
有大量上传下载
有企业客户使用
对稳定性要求很高
需要合规备案和大陆 CDN
```

这种项目就别拿过渡方案硬撑。

该备案备案，该上国内云上国内云，该用香港或新加坡节点就评估实际延迟。基础设施这件事，早期可以轻，到了有用户和收入的时候就要认真。

## 我的结论

Vercel + Cloudflare 这套组合，我会继续用在小项目早期。

原因很简单：它便宜、快、改起来方便。

域名交给 Cloudflare 管，项目继续放在 Vercel 上，先让朋友和早期用户能打开。等产品真的有人用，再根据访问数据和业务阶段升级方案。

但我不会把它包装成国内访问解决方案。

它更像一个过渡桥。

能让你从“项目做好了但别人打不开”，先走到“别人能打开并给你反馈”。

对独立开发者来说，这一步就够有价值了。

产品早期真正要验证的是：这个东西有没有人需要。

基础设施先做到够用，别一上来就把自己困在配置里。

---

参考官方文档：

- Vercel：Should I use Cloudflare in front of Vercel?
- Vercel：Setting up a custom domain
- Vercel：How do I resolve err_too_many_redirects when using a Cloudflare proxy with Vercel?
- Cloudflare：DNS proxy status use cases
- Cloudflare：Get started with Cache
- Cloudflare：China Network

关于我：我是良逍，设计出身，现在做产品，主业做跨境电商 CMS / ERP 系统，业余持续用 AI 做 iOS 和 Web 产品。这里记录的都是自己实际折腾过的产品、部署和内容工作流。
