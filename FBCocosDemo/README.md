# FBCocosDemo 介绍
Build with Cocos Creator 2.2.0, and should be compatible with 2.x (not with 3.x)

本项目使用Cocos Creator 2.2.0编写，应该兼容Creator 2.x版本，不兼容Creator 3.x版本。

## Usage 使用方法
使用Facebook 小游戏方式打包，上传Facebook小游戏后台，然后测试。

### 广告参数
修改 assets/Script/FBApp.ts中的广告参数
```
const FB_ADS = {
    INTERSTITIAL: "4262010590525770_4272912656102230",   // 插屏
    REWARDED_VIDEO: "4262010590525770_4272913659435463", // 激励视频
    BANNER: "4262010590525770_4272911552769007",         // banner
}
```

## Facebook Instant Game SDK
官方文档: https://developers.facebook.com/docs/games/instant-games/sdk/fbinstant7.0

## 核心文件
使用的话，直接看广告管理器 /Script/FBAdManager.ts

### 使用步骤
#### 1. 添加需要的广告类型
接口: ```addXXXXAd()``` 
添加相应的广告，以及预加载的数量（默认为3)

* 1). 插屏 addInterstitial
* 2). 激励视频 addRewardedVideo
* 3). banner addBanner

#### 2. 启动预加载
接口: ```loadAll()```
预加载所有广告实例

注意: 加载失败后会自动延迟继续尝试加载

#### 3. 检查是否可播放
接口: ```isXXXReady()``` 
检查是否可以播放

* 1). 插屏  isInterstitialAdReady
* 2). 激励视频 isRewardedVideoReady
* 3). banner isBannerReady

#### 4. 播放广告
接口: ```showXXXAsync()```
播放广告，并检查播放状态

* 1). 插屏 showInterstitialAd
* 2). 激励视频 showRewardedVideo
* 3). banner showBannerAsync

#### 5. 隐藏广告
接口: ```hideXXXAsync()``
部分广告类型支持隐藏广告, 如banner

* 1). 插屏 不需要
* 2). 激励视频 不需要
* 3). banner hideBannerAsync

#### 6. 其他
判断是否支持特定api


### 控制参数
```
const FB_MAX_AD_INSTANCE = 3;   // FB允许的最多广告实例数量
const FB_INIT_AD_COUNT = 3;     // 预加载的广告实例数量

const FB_BANNER_REFRESH_INTERVAL = 30+10; // FB: Banner广告有播放间隔限制 30 seconds (由于网络原因，需要多加一点时间)
const FB_INTERSTITIAL_REFRESH_INTERVAL = 30+10; // FB: 插屏广告有播放间隔限制
const FB_REWARDED_VIDEO_REFRESH_INTERVAL = 0;   // FB: 激励视频没有播放间隔限制

const FB_MAX_BANNER_ERROR = 1;              // banner加载连续出现N次错误后，终止加载
const FB_MAX_INTERSTITIAL_ERROR = 3;        // 插屏加载连续出现N次错误后，终止加载
const FB_MAX_REWARDED_VIDEO_ERROR = 3;      // 激励视频加载连续出现N次错误后，终止加载

const FB_AUTO_LOAD_ON_PLAY = true;          // 插屏、激励视频是否在播放完毕后自动加载
const FB_AUTO_RELOAD_DELAY = 1;             // 自动重新加载时，延迟加载等待的时间

const FB_AD_DELAY_FOR_FIRST_BANNER = 0;         // 首个banner广告延迟N秒显示
const FB_AD_DELAY_FOR_FIRST_INTERSTITIAL = 30;  // 首个插屏广告需要延迟30秒播放（避免游戏前30秒就播放广告）
const FB_AD_DELAY_FOR_FIRST_REWARDED_VIDEO = 0; // 首个激励视频广告延迟N秒显示
```