tools: Froyocomb Helper & Environment Setup
===========

## FakeMarket, ProvisionCDMA and LightEmUp!
These quality of life applications are included within the `applications` folder. Each applications has its own `README.md` explaining what the app does.

## Froyocomb Helper
@Dobby233Liu's userscript, that highlights all commits present to a certain point in time. The tool is meant for use with [AOSP](https://android.googlesource.com) and [Chromium](https://chromium.googlesource.com)'s Git instances only.

#### Installing Froyocomb Helper

To install Froyocomb Helper, use a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/). Then, [click here](https://github.com/froyocomb/tools/raw/refs/heads/main/Froyocomb%20Helper.user.js). After clicking, in newly opened tab, select the option to install. 

## Froyocomb Environment Setup
@inteneich's Bash script, which prepares a build environment for Android.

#### Using Environment Setup

Download the script from the repository [here](https://raw.githubusercontent.com/froyocomb/tools/main/envsetup.sh) or use the command below (Ubuntu 14.04+). There are no dependencies required to use the script.

```sudo bash -c "$(wget -qO- https://raw.githubusercontent.com/froyocomb/tools/main/envsetup.sh)"```

## Android OTA Patcher
@main3782's batch script, manually applies old Android OTA patches on top of existing files. Requires bspatch.exe and xdelta3.exe, which are included.

## android.googlesource.com Dark Mode
Vibecoded CSS script for the android.googlesource.com web-page in order to turn it from light mode to dark mode.

## GOTA Prober
Python script originally authored by @laniku and improved by @RYuhMine. This is located at [`froyocomb/ota_prober`](https://github.com/froyocomb/ota_prober).
