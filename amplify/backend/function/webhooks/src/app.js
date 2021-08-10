/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["MERAKI_API_KEY","WEBEX_ACCESS_TOKEN"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/


/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_ACCESSREQUEST_ARN
	STORAGE_ACCESSREQUEST_NAME
	STORAGE_ACCESSREQUEST_STREAMARN
	STORAGE_USER_ARN
	STORAGE_USER_NAME
	STORAGE_USER_STREAMARN
Amplify Params - DO NOT EDIT */

const AWS = require('aws-sdk')
const ssm = new AWS.SSM()

const express = require('express')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

const moment = require('moment-timezone')

const { AccessRequest } = require('/opt/nodejs/AccessRequest')
const { Errors, RESTError } = require('/opt/nodejs/Error')
const { Meraki } = require('/opt/nodejs/Meraki')
const { User } = require('/opt/nodejs/User')
const { Webex } = require('/opt/nodejs/Webex')

// declare a new express app
const app = express()
app.use(express.json())
app.use(awsServerlessExpressMiddleware.eventContext())
// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
});

app.post('/webhooks/webex', async function(req, res) {

  // Obtain Webex Action ID
  const actionId = req.body.data.id
  const ssids = [0, 1]
  const ssidConfiguration = {
    0: {
      accountType: 'Guest'
    },
    1: {
      accountType: '802.1X'
    }
  }

  try {
    // Obtain secrets for Webex
    const [WEBEX_ACCESS_TOKEN, MERAKI_API_KEY] = await Promise.all([
     ssm.getParameters({
          Names: ["WEBEX_ACCESS_TOKEN"].map(secretName => process.env[secretName]),
          WithDecryption: true,
        })
        .promise()
        .then(response => response.Parameters[0].Value),
      ssm.getParameters({
          Names: ["MERAKI_API_KEY"].map(secretName => process.env[secretName]),
          WithDecryption: true,
        })
        .promise()
        .then(response => response.Parameters[0].Value)
    ])

    // Obtain Webex Action Details
    const webex = new Webex(WEBEX_ACCESS_TOKEN, process.env.WEBEX_BASE_URL)
    const action = await webex.getWebhookAttachmentActionDetails(actionId)
    console.log(action)
    const accessRequestId = action.inputs.id
    const duration = action.inputs.duration

    // Fetch Access Request with ID in Action Details
    const accessRequest = new AccessRequest(Errors, RESTError, accessRequestId)
    await accessRequest.queryDynamoDB()
    
    // Fetch Guest and Host from the Access Request
    const guest = new User(process.env, null, webex, Errors, RESTError, accessRequest.guestEmail)
    const host = new User(process.env, null, webex, Errors, RESTError, accessRequest.hostEmail)
    await Promise.all([guest.init(), host.init()])

    if (accessRequest.status === 'created') {

      // If the host has accepeted access
      if (action.inputs.action) {
        
        // Validate the Access Request
        // If valid, create Meraki Auth User
        if (accessRequest.id === guest.accessRequestId &&
            action.roomId === host.webexRoomId) {
          console.log(`[POST][/webhooks/webex] Access request ID and room ID match`)
          
          const meraki = new Meraki(MERAKI_API_KEY, process.env.MERAKI_BASE_URL)
          const expiresAt = moment().tz("Australia/Sydney").add(parseInt(duration), 'minutes').toISOString()
          console.log(`[POST][/webhooks/webex] expiresAt=${expiresAt}`)
          const emailPasswordToUser = "true"

          for (const ssid of ssids) {
            // Check if Meraki Auth User ID already exists for SSID.
            // If it does, update Meraki Auth User
            if (guest.merakiAuthUserIds[ssid]) {
              console.log(`[POST][/webhooks/webex] Updating Meraki Auth User for SSID ${ssid}`)
              const authorizations = [
                {
                  ssidNumber: `${ssid}`,
                  expiresAt: expiresAt
                }
              ]
              const merakiAuthUser = await meraki.updateNetworkMerakiAuthUser(process.env.MERAKI_NETWORK_ID, guest.merakiAuthUserIds[ssid], guest.password, authorizations, emailPasswordToUser)
              console.log(merakiAuthUser)
            }
            // Else, create Meraki Auth User
            else {
              console.log(`[POST][/webhooks/webex] Creating Meraki Auth User for SSID ${ssid}`)
              const authorizations = [
                {
                  ssidNumber: `${ssid}`,
                  expiresAt: expiresAt
                }
              ]
              const accountType = ssidConfiguration[ssid].accountType
              const merakiAuthUser = await meraki.createNetworkMerakiAuthUser(process.env.MERAKI_NETWORK_ID, guest.email, `${guest.firstName} ${guest.lastName}`, guest.password, authorizations, accountType, emailPasswordToUser)
              guest.merakiAuthUserIds[ssid] = merakiAuthUser.id
            }
          }

          accessRequest.status = 'accepted'
          await Promise.all([
            guest.commitToDynamoDB(),
            accessRequest.commitToDynamoDB(),
            host.sendWebexText(WEBEX_ACCESS_TOKEN, `You have granted guest Wi-Fi access for ${guest.firstName} ${guest.lastName} (${guest.email}) for ${duration} minutes`)
          ])
        }
        // Else, throw an error
        else {
          console.warn(`[POST][/webhooks/webex] Access request ID and room ID do not match \
            accessRequest.id=${accessRequest.id} guest.accessRequest=${guest.accessRequestId} \
            action.roomId=${action.roomId} host.webexRoomId=${host.webexRoomId}`)
          throw new RESTError(Errors.BadRequest)
        }
      }
      // Else the host has declined access
      else {
        accessRequest.status = 'declined'
        await Promise.all([
          accessRequest.commitToDynamoDB(),
          host.sendWebexText(WEBEX_ACCESS_TOKEN, `You have declined guest Wi-Fi access for ${guest.firstName} ${guest.lastName} (${guest.email})`)
        ])
      }
    }
    else {
      await host.sendWebexText(WEBEX_ACCESS_TOKEN, `You have already responded to this request`)
    }
  } catch(err) {
    console.warn(`[POST][/webhooks/webex] Error id=${actionId}`)
    console.warn(err)
    return res.status('500').json({
      title: err.message,
      'invalid-params': []
    })
  }

  res.sendStatus(200);
});


app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
