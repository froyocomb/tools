# LightEmUp!
App that spoofs the check to Google's servers, making the Wi-Fi and signal icons the proper green/blue/white colors instead of gray/orange. The application is targeted for Android Gingerbread to Android KitKat/Android Lollipop (beta).

## What does this application specifically patch?
Once Wi-Fi is connected, Android's status bar pings Google's servers in order to check if it can reach the internet. Unfortunately, this is no longer possible on most Android versions due to the servers now being taken down.

Inside `SystemUI`/`NetworkController`/`StatusBarPolicy`, a singular flag is present that manages this named `mInetCondition`. The flag gets set from a broadcast (`INET_CONDITION_ACTION`), which carries a 0-100 "how good is the internet this phone is connected to" score. From **0-50**, the icons are gray, from **51-100**, the icons are colored. The application basically spoofs this broadcast to always say **100**, making the icons always colored.

## Installation
**This package does not work via a simple `adb install`!**

### Method 1 (AOSP-only)
Include it in your compile under packages/apps/LightEmUp and add "LightEmUp" to any `PRODUCT_PACKAGES` that is inherited during compile, for example in `build/target/product`.

### Method 2 (AOSP and Google builds)
Copy the pre-compiled APK using a custom recovery or some other method to `/system/app/LightEmUp.apk` and reboot.

By Froyocomb @ 2026
