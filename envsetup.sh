#!/bin/bash
# Easy to fool over, also might not work in earlier implementations, unless it is standardized
VERSION_ID=`cat /etc/os-release | grep "VERSION_ID" | sed 's/VERSION_ID=//g' | sed 's/["]//g'`
CODENAME=`cat /etc/lsb-release | grep "DISTRIB_CODENAME" | sed 's/DISTRIB_CODENAME=//g' | sed 's/["]//g'` 

# User-facing functions (CLI)
print_banner() {
    cat <<'EOF'
   __                                           _
  / _|_ __ ___  _   _  ___   ___ ___  _ __ ___ | |__
 | |_| '__/ _ \| | | |/ _ \ / __/ _ \| '_ ` _ \| '_ \
 |  _| | | (_) | |_| | (_) | (_| (_) | | | | | | |_) |
 |_| |_|  \___/ \__, |\___/ \___\___/|_| |_| |_|_.__/
                |___/

                made by @inteneich

EOF
}

menu(){
check_root_user
while true; do
print_banner 
echo 'Choose what to do: '
 echo "1 - Prepare the environment (RECOMMENDED)"
 echo "2 - Obtain JDK"
 echo "q - Exit the script"
 read -p "Select your choice: " option
 case "$option" in
 1) 
   auto
   msg 'The environment was prepared!'
   ask_reboot
   menu ;;
 2) 
   clear
   select_jdk
#   ask_reboot
   ;;
 q)
   clear
   exit 0 ;;
 *)
   error_msg 'Wrong input!' ;;
 esac
done
}

# Task functions
restore_repositories(){
     sed -Ei 's|[a-z]{2}\.archive\.ubuntu\.com|old-releases.ubuntu.com|g; s|security\.ubuntu\.com|old-releases.ubuntu.com|g' /etc/apt/sources.list
}

update_system(){
  apt-get update && apt-get upgrade -y 
}

gcc_42(){
  echo -e "deb http://old-releases.ubuntu.com/ubuntu hardy main restricted" | tee /etc/apt/sources.list.d/ubuntu-hardy.list > /dev/null
  update_system
  apt-get -y install gcc-4.2 g++-4.2 gcc-4.2-multilib g++-4.2-multilib
}

install_dependencies(){
  apt-get -y install gnupg flex bison gperf build-essential gcc-multilib g++-multilib zip curl python-markdown xsltproc
  if [ $VERSION_ID == 12.04 ]
    then
    apt-get -y install libc6-dev libncurses5-dev:i386 x11proto-core-dev libx11-dev:i386 libreadline6-dev:i386 libgl1-mesa-dev gcc-4.4 g++-4.4 gcc-4.4-multilib g++-4.4-multilib mingw32 tofrodos libxml2-utils zlib1g-dev:i386
    ln -s /usr/lib/i386-linux-gnu/mesa/libGL.so.1 /usr/lib/i386-linux-gnu/libGL.so
  fi
  if [ $VERSION_ID == 14.04 ]
    then
  apt-get -y install zlib1g-dev libswitch-perl libc6-dev-i386 lib32ncurses5-dev x11proto-core-dev libx11-dev lib32z-dev ccache libgl1-mesa-dev libxml2-utils unzip
  fi
}

install_new_git(){
echo -e "deb http://ppa.launchpad.net/git-core/ppa/ubuntu $CODENAME main\ndeb-src http://ppa.launchpad.net/git-core/ppa/ubuntu $CODENAME main" | tee /etc/apt/sources.list.d/git-core.list > /dev/null
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys E363C90F8F1B6217
update_system
apt-get -y install git 
git config --global user.email "build@froyocomb.org"
git config --global user.name "Froyocomb Build"
}

compile_py(){
  if [ $VERSION_ID == 12.04 ]
    then
  apt-get build-dep python3.2 -y
  fi
  if [ $VERSION_ID == 14.04 ]
    then
  apt-get build-dep python3.4 -y
  fi
  wget https://www.python.org/ftp/python/3.6.15/Python-3.6.15.tgz -O /tmp/Python-3.6.15.tgz
  tar -xf /tmp/Python-3.6.15.tgz -C /tmp/
  cd /tmp/Python-3.6.15
  ./configure
  make -j$(nproc) && make install
}

setup_repo(){
  mkdir -p ~/.bin
  curl https://raw.githubusercontent.com/GerritCodeReview/git-repo/refs/tags/v2.60.1/repo > ~/.bin/repo
  chmod +x ~/.bin/repo
  echo 'export PATH="${HOME}/.bin:${PATH}"' >> ~/.bashrc
  PATH="${HOME}/.bin:${PATH}"
}

select_jdk(){
while true; do
print_banner
echo "Select which Java version you want to use."
echo "1 - JDK 5"
echo "2 - JDK 6"
echo "3 - JDK 7"
echo "4 - JDK 8 (only available on 14.04)"
echo "q - Go back to the main menu"
 read -p "Select your option: " jdk_option
 case "$jdk_option" in 
 1) 
   export JDK_VERSION=jdk1.5.0_22 
   detect_jdk ;;
 2) 
   export JDK_VERSION=jdk1.6.0_45 
   detect_jdk ;;
 3)
   export JDK_VERSION=java-7-openjdk-amd64 
   detect_jdk ;;
 4)
    if [ $VERSION_ID == 14.04 ]
      then
   export JDK_VERSION=java-8-openjdk-amd64
   detect_jdk
      else
   error_msg 'You must run Ubuntu 14.04 to install JDK 8.'
   select_jdk
    fi ;;
 q)
   clear
   menu ;;
 esac
done
}

detect_jdk(){
if [ -d /usr/lib/jvm/$JDK_VERSION ]
 then
   set_default_jdk
   msg 'Java was successfully set!'
 else
if [ $JDK_VERSION = jdk1.5.0_22 ] || [ $JDK_VERSION = jdk1.6.0_45 ]
 then
  if ! [ -d /tmp/$JDK_VERSION.bin ]; then
   download_jdk
  fi
   unzip_jdk
   install_jdk_associations
   set_default_jdk
   msg 'Java was successfully installed!'
 else
   install_deb_jdk
   msg 'Java was successfully installed!'
   if [ -d /usr/lib/jvm/jdk1.5.0_22 ] || [ -d /usr/lib/jvm/jdk1.6.0_45 ]
    then
	install_jdk_associations
	set_default_jdk
	msg 'Java was successfully set!'
   fi
fi
fi
}

download_jdk(){
   if [ $JDK_VERSION = jdk1.5.0_22 ]
    then 
	 wget https://archive.org/download/jdk-1_5_0_22-linux-i586/jdk-1_5_0_22-linux-amd64.bin -O /tmp/jdk1.5.0_22.bin
   fi
   if [ $JDK_VERSION = jdk1.6.0_45 ]
    then 
	 wget https://repo.huaweicloud.com/java/jdk/6u45-b06/jdk-6u45-linux-x64.bin -O /tmp/jdk1.6.0_45.bin
   fi
}

unzip_jdk(){
   chmod a+x /tmp/*.bin
   cd /tmp
   /tmp/$JDK_VERSION.bin
   if ! [ -d /usr/lib/jvm ]
    then
      mkdir /usr/lib/jvm
   fi
   mv -f /tmp/$JDK_VERSION --target-directory=/usr/lib/jvm/
   }

install_jdk_associations(){ 
   for i in /usr/lib/jvm/$JDK_VERSION/bin/*; do
        name=$(basename "$i")
         update-alternatives --install "/usr/bin/$name" "$name" "$i" 1
   done
}

set_default_jdk(){ 
   for i in /usr/lib/jvm/$JDK_VERSION/bin/*; do
        name=$(basename "$i")
	update-alternatives --set "$name" "$i"
   done
}
  
install_deb_jdk(){
   if [ $JDK_VERSION = java-7-openjdk-amd64 ]
    then
     apt-get install -y openjdk-7-jdk
   fi
   if [ $JDK_VERSION = java-8-openjdk-amd64 ]
    then
  apt-get install -y ca-certificates-java java-common libatk-wrapper-java-jni libatk-wrapper-java libgif4 --no-install-recommends
     wget https://old-releases.ubuntu.com/ubuntu/pool/universe/o/openjdk-8/openjdk-8-jre-headless_8u45-b14-1_amd64.deb -O /tmp/openjdk-8-jre-headless_8u45-b14-1_amd64.deb
     wget https://old-releases.ubuntu.com/ubuntu/pool/universe/o/openjdk-8/openjdk-8-jre_8u45-b14-1_amd64.deb -O /tmp/openjdk-8-jre_8u45-b14-1_amd64.deb
     wget https://old-releases.ubuntu.com/ubuntu/pool/universe/o/openjdk-8/openjdk-8-jdk_8u45-b14-1_amd64.deb -O /tmp/openjdk-8-jdk_8u45-b14-1_amd64.deb
     dpkg -i /tmp/openjdk-8-jre-headless_8u45-b14-1_amd64.deb && dpkg -i /tmp/openjdk-8-jre_8u45-b14-1_amd64.deb && dpkg -i /tmp/openjdk-8-jdk_8u45-b14-1_amd64.deb
   fi
}

# Minor functions, used for CLI interface
check_root_user(){
    if [ "$(id -u)" != 0 ]; then
        echo 'You must use sudo to run the script.'
        exit
    fi
} 

msg() {
    tput setaf 2
    echo "[*] $1"
    tput sgr0
}

error_msg() {
    tput setaf 1
    echo "[!] $1"
    tput sgr0
}

ask_reboot() {
    echo 'Do you want to reboot now? (y/n)'
    while true; do
        read choice
        if [[ "$choice" == 'y' || "$choice" == 'Y' ]]; then
            reboot
            exit 0
        fi
        if [[ "$choice" == 'n' || "$choice" == 'N' ]]; then
            clear
            exit 0
        fi
    done
}

auto(){
  if [ $VERSION_ID == 12.04 ]
    then
   msg 'Restoring repositories'
   restore_repositories
  fi
   msg 'Updating the system'
   update_system
   msg 'Adding new Git'
   install_new_git
   msg 'Installing dependencies'
   install_dependencies
  if [ $VERSION_ID == 12.04 ]
    then
   gcc_42
  fi
   msg 'Compiling Python 3.6'
   compile_py
   msg 'Downloading repo'
   setup_repo
}

start(){
if [ $VERSION_ID == 12.04 ] || [ $VERSION_ID == 14.04 ]
 then
  clear
  menu
else
  echo "You must run Ubuntu 12.04 or 14.04 to use the script."
  exit
fi
}

start
