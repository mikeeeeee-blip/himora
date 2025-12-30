ssh -i "payments.ninexgroup.mumbai.pem" ubuntu@ec2-13-201-166-231.ap-south-1.compute.amazonaws.com


cd /home/pranjal/himora/mobile-app/android && ./gradlew assembleRelease



eas build --platform android --profile preview --local


cd /home/pranjal/himora/mobile-app/android
./gradlew clean
./gradlew assembleRelease