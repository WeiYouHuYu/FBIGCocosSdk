# FBIGCocosSdk 关于
Facebook Instant Game SDK for Cocos Creator。
本项目对Facebook小游戏SDK进行二次封装，并提供Cocos Creator的测试项目。
## Finished Feature List 已完成的功能
### Ads 广告功能封装
Facebook小游戏SDK中对于广告的使用有较多的误导，所以优先对该功能进行封装。

主要文件
* FBCocosDemo/assets/Script/FBAdManager.ts

目前支持
* Interstitial 插屏广告
* RewardedVideo 激励视频广告
* Banner 横幅广告

增加了以下功能
* 状态处理
* 错误处理
* 刷新间隔
* 数量限制
* 顺序延迟预加载
* 播放后自动加载
### 接口说明
广告管理器 FBAdManager.ts文件
#### 1. addXXXXAd() 添加相应的广告，以及预加载的数量（默认为3)
* 1.1. 插屏 addInterstitial
* 1.2. 激励视频 addRewardedVideo
* 1.3. banner addBanner

#### 2. loadAll() 预加载所有广告实例

#### 3. isXXXReady() 检查是否可以播放
* 3.1. 插屏  isInterstitialAdReady
* 3.2. 激励视频 isRewardedVideoReady
* 3.3. banner isBannerReady

#### 4. showXXXAsync() 播放广告，并检查播放状态
* 4.1. 插屏 showInterstitialAd
* 4.2. 激励视频 showRewardedVideo
* 4.3. banner showBannerAsync

#### 5 hideXXXAsync() 隐藏广告（banner专属)
* 5.1. 插屏 不需要
* 5.2. 激励视频 不需要
* 5.3. banner hideBannerAsync

#### 其他
* 6）. 判断是否支持特定api
* 6.1 判断是否支持banner广告
#### 参数
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
### 接入示例
参考 FBCocosDemo/assets/Script/FBApp.ts
#### 复制并引入FBAdManager.ts
直接将文件复制到项目中

#### 初始化
```
    // 设置广告id,
    const FB_ADS = {
        INTERSTITIAL: "插屏广告",
        REWARDED_VIDEO: "激励视频",
        BANNER: "banner",
    }

    // 添加插屏（默认创建3个实例)
    try{
        FBAdManager.addInterstitial(FB_ADS.INTERSTITIAL);
    }catch(e){
        console.info("添加插屏广告失败，错误: " + e.message);
    }

    // 添加激励视频（默认创建3个实例)
    try{
        FBAdManager.addRewardedVideo(FB_ADS.REWARDED_VIDEO);        
    }catch(e){
        console.info("添加激励视频广告失败，错误: " + e.message);
    }

    // 添加banner (仅1个实例)
    FBAdManager.addBanner(FB_ADS.BANNER);

    // 预加载广告 (异步顺序加载)
    FBAdManager.loadAll();
```

#### 播放插屏
```
    if(FBAdManager.isInterstitialAdReady()){
        // 广告已经可以播放
        FBAdManager.showInterstitialAd().then(()=>{
            // 播放插屏广告: 成功
        }).catch(e=>{
            // 播放插屏广告: 失败，原因 e.message
        });
        // 注意：无论播放成功与否，都会延迟1秒后自动加载新广告
    }else{
        // 广告未加载完毕，或者播放间隔未到
    }
```

#### 播放激励视频
```
    if(FBAdManager.isRewardedVideoReady()){
        // 广告已经可以播放
        FBAdManager.showRewardedVideo().then(()=>{
            // 播放激励视频广告: 成功
        }).catch(e=>{
            // 播放激励视频广告: 失败，原因 e.message
            // 注意：用户取消播放也走这个分支
        });
        // 注意：无论播放成功与否，都会延迟1秒后自动加载新广告
    }else{
        // 没有可用广告，包括广告未加载完毕，或者播放间隔未到
    }
```

#### 显示或者刷新Banner
```
    // 先判断是否满足banner刷新间隔（fb规定需要间隔30秒才能刷新banner）
    if(FBAdManager.isBannerReady()){
        FBAdManager.showBannerAsync().then(()=>{
            // 显示Banner广告: 成功
        }).catch(e=>{
            // 显示Banner广告: 失败，原因: + e.message
        });
    }else{
        // 未满足显示间隔要求
    }
```
#### 隐藏Banner
```
    // 隐藏banner
    FBAdManager.hideBannerAsync().then(()=>{
        // 隐藏Banner广告: 成功
    }).catch(e=>{
        // 隐藏Banner广告: 失败，原因: + e.message
        // 注意：如果不在播放状态，隐藏会抛异常
    });
```

### Cocos测试用例
![alt 广告模块](images/FBIG-Cocos-01.png)


## In progress 接入中
* In App Purchase 内购
* others

## Cocos Creator 2.x demo
> [Cocos Creator 2.x demo](FBCocosDemo/README.md)

# Contact 联系
* https://xmanyou.com
* https://www.minigame.vip
* zhangzhibin@minigame.vip
* zhangzhibin@gmail.com