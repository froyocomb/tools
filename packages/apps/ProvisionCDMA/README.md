# ProvisionCDMA
This is an application that gets rid of the "com.android.phone" crash seen on Motorola XOOM Verizon models (specifically MZ600/MZ602) when running AOSP builds. The application spoofs SetupWizard's "PERFORM_VOICELESS_CDMA_PROVISIONING" flag in order to trick "com.android.phone" into thinking the provisioning popup was launched, effectively getting rid of the error.

By Froyocomb @ 2026
