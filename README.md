# Serverless Guest Wi-Fi
Serverless Guest Wi-Fi is an application that provides secure (802.1X) guest Wi-Fi and modernizes the onboarding process from checking in at reception to connecting to Wi-Fi.

- [Description](#Description)
- [Deploying](#deploying)
- [Demo](#demo)

## Description
Guest Wi-Fi has not changed much in the past and this application demonstrates guest Wi-Fi using 802.1X for the SSID's authentication method. The application leverages AWS serverless to keep operational work to a minimum and in addition, the SSID uses Meraki Authentication which eliminates the need of a RADIUS server.

The application leverages the custom of guests checking in at the reception. The guest will fill the form with their information (first name, last name, email, and organization) and the host's email who is visiting. Upon successfully submitting the form, a Webex bot will message the host that the guest has arrived, and the message will include two buttons to accept or decline access to guest Wi-Fi. If the host clicks the button accept, the application will provision Meraki Authentication accounts, and the Meraki Dashboard will send passwords for each account via email. If the host clicks the button decline, the application will not create these accounts. Below is a simplified sequence diagram.

<p align="center">
  <img src="https://yujiterada.s3.us-west-2.amazonaws.com/serverless-guest-wifi/sequence_diagram.jpeg" width="600">
</p>

## Deploying
Will be updated after moving some code in Lambda function to layers for minimum configuration.

## Demo
This app has a demo environment. Read the requirements and steps below to use it.
### Requirements
This demo requires a physical MR. Also, some email input in the form requires a Webex account. The following is the list of requirements.
- Meraki Access Point (MR)
- Webex account for email inserted in [management](https://guestwifi.apicli.com/management)
- Webex account for email inserted as host in [checkin](https://guestwifi.apicli.com/checkin)

### Steps
1. Add MR from [management](https://guestwifi.apicli.com/management)
2. The guest will fill the form with his/her details and host's email at [checkin](https://guestwifi.apicli.com/checkin)
3. The host will click the accept button in the Webex message received

<p align="center">
  <img src="https://yujiterada.s3.us-west-2.amazonaws.com/serverless-guest-wifi/webex_message.png" width="400">
</p>

4. The guest will receive email with crendentials via email

<p align="center">
  <img src="https://yujiterada.s3.us-west-2.amazonaws.com/serverless-guest-wifi/email.png" width="400">
</p>

5. The guest will connect to SSID with name "Guest WiFi dot1x"

<p align="center">
  <img src="https://yujiterada.s3.us-west-2.amazonaws.com/serverless-guest-wifi/ssid.png" width="400">
</p>