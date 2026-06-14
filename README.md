tools: Froyocomb Helper & Environment Setup
===========

## Froyocomb Helper
@Dobby233Liu's userscript, that highlights all commits present to a certain point in time. The tool is meant for use with [AOSP](android.googlesource.com) and [Chromium](chromium.googlesource.com)'s Git instances only.

#### Installing Froyocomb Helper

To install Froyocomb Helper, use a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/). Then, [click here](https://github.com/froyocomb/tools/raw/refs/heads/main/Froyocomb%20Helper.user.js). After clicking, in newly opened tab, select the option to install. 

## Froyocomb Environment Setup
@inteneich's Bash script, which prepares a build environment for Android.

#### Using Environment Setup

Download the script from the repository [here](https://raw.githubusercontent.com/froyocomb/tools/main/envsetup.sh) or use the command below (Ubuntu 14.04+). There are no dependencies required to use the script.

```sudo bash -c "$(wget -qO- https://raw.githubusercontent.com/froyocomb/tools/main/envsetup.sh)"```

## Android OTA Patcher
@main3782's batch script, manually applies old Android OTA patches on top of existing files. Requires bspatch.exe and xdelta3.exe, which are included.


	
	
