/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["WEBEX_ACCESS_TOKEN","MERAKI_API_KEY"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_DEVICE_ARN
	STORAGE_DEVICE_NAME
	STORAGE_DEVICE_STREAMARN
	STORAGE_USER_ARN
	STORAGE_USER_NAME
	STORAGE_USER_STREAMARN
Amplify Params - DO NOT EDIT *//*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/


const AWS = require('aws-sdk')
const ssm = new AWS.SSM()

const express = require('express')
const { check, validationResult } = require('express-validator')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

const { Device } = require('/opt/nodejs/Device')
const { Meraki } = require('/opt/nodejs/Meraki')
const { Webex } = require('/opt/nodejs/Webex')
const { Errors, RESTError } = require('/opt/nodejs/Error')
const { User } = require('/opt/nodejs/User')

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

app.get('/devices/:serial', async function(req, res) {
  // Obtain secrets
  const MERAKI_API_KEY = await ssm.getParameters({
    Names: ["MERAKI_API_KEY"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  }).promise()
    .then(response => response.Parameters[0].Value)
    .catch(err => {
      console.warn(err)
      throw err
    })
  
  const meraki = new Meraki(MERAKI_API_KEY, process.env.MERAKI_BASE_URL)
  const device = new Device(process.env, meraki, Errors, RESTError, req.params.serial)
  try {
    await device.init()
  } catch (err) {
    return res.status(err.status).json({
      title: err.message,
      'invalid-params': err.invalidParams
    })
  }
  if (device.hasDataConflict) {
    const err = new RESTError(Error.InternalServerError)
    return res.status(err.status).json({
      title: err.message,
      'invalid-params': err.invalidParams
    })
  }
  else {
    return res.status(200).json(device)
  }
});

app.post('/devices',
  [
    check('serial')
      .matches(/[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}/)
      .withMessage("Invalid serial number. A serial number needs to be in the format XXXX-XXXX-XXXX."),
    check('email')
      .isEmail()
      .withMessage("Invalid email address.")
  ], async function(req, res) {
    // Validate inputs
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ 
        title: 'Failed validation',
        'invalid-params': errors.array()
      })
    }

    try {
      // Obtain secrets for Webex and Meraki
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
      let promises = []

      const meraki = new Meraki(MERAKI_API_KEY, process.env.MERAKI_BASE_URL)
      const webex = new Webex(WEBEX_ACCESS_TOKEN, process.env.WEBEX_BASE_URL)
      const device = new Device(process.env, meraki, Errors, RESTError, req.body.serial, req.body.email)
      const user = new User(process.env, meraki, webex, Errors, RESTError, req.body.email)

      await Promise.all([device.init(), user.init()])
      // If there is a data mismatch between DynamoDB and Meraki Network, then log error
      if (device.hasDataConflict) {
        console.warn("Data conflict between DynamoDB and Meraki Dashboard")
      }

      // If user does not exist in DynamoDB,
      // then send welcome message and create user in DynamoDB
      if (!user.webexRoomId) {
        await user.sendWebexWelcomeText(WEBEX_ACCESS_TOKEN)
      }
      if (!req.body.serial in user.devices) {
        user.devices.push(req.body.serial)
      }
      promises.push(user.commitToDynamoDB())

      // Add to Meraki organization
      if (!device.existsInMerakiNetwork) {
        if (!device.existsInMerakiInventory) {
          await device.addToMerakiInventory()
        }
        promises.push(device.addToMerakiNetwork())
        promises.push(user.sendWebexText(WEBEX_ACCESS_TOKEN, `${req.body.serial} added to Guest Wi-Fi Demo App.`))
        promises.push(device.commitToDynamoDB())
      }

      // Add to Meraki Network, commmit changes to DynamoDB and send text
      await Promise.all(promises)
    } catch(err) {
      if (err instanceof RESTError) {
        return res.status(err.status).json({
          title: err.message,
          'invalid-params': err.invalidParams
        })
      }
      else {
        console.warn(`[POST][/devices] ${err}`)
        return res.status('500').json({
          title: err.message,
          'invalid-params': []
        })
      }
    }
    // return success
    return res.json({})
});

app.delete('/devices', 
  [
    check('serial')
      .matches(/[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}/)
      .withMessage("Invalid serial number. A serial number needs to be in the format XXXX-XXXX-XXXX."),
    check('email')
      .isEmail()
      .withMessage("Invalid email address.")
  ], async function(req, res) {
    // Validate inputs
    const errors = validationResult(req)
    // If validation fails, return 422
    if (!errors.isEmpty()) {
      return res.status(422).json({ 
        title: 'Failed validation',
        'invalid-params': errors.array()
      })
    }

    try {
      // Obtain secrets for Webex and Meraki
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

      const meraki = new Meraki(MERAKI_API_KEY, process.env.MERAKI_BASE_URL)
      const webex = new Webex(WEBEX_ACCESS_TOKEN, process.env.WEBEX_BASE_URL)
      const device = new Device(process.env, meraki, Errors, RESTError, req.body.serial, req.body.email)
      const user = new User(process.env, meraki, webex, Errors, RESTError, req.body.email)

      await Promise.all([device.init(), user.init()])
      // If there is a data mismatch between DynamoDB and Meraki Network,
      // then throw error
      if (device.hasDataConflict) {
        throw new RESTError(Errors.InternalServerError)
      }
      // Else if the device does not exist in DynamoDB, then throw error
      else if (!device.existsInDynamoDB) {
        throw new RESTError(Errors.NotFound)
      }
      // Else if the user does not exist exist in DynamoDB, then throw error
      else if (!user.existsInDynamoDB) {
        throw new RESTError(Errors.NotFound) 
      }

      // Everything matches so delete from DynamoDB tables (Device, User.devices),
      // Meraki Network and send text
      user.removeSerialFromDevices(req.body.serial)
      await Promise.all([
          device.removeFromDynamoDB(),
          device.removeFromMerakiNetwork(),
          user.commitToDynamoDB(),
          user.sendWebexText(WEBEX_ACCESS_TOKEN, `${req.body.serial} removed from Guest Wi-Fi Demo App.`)
        ])

    } catch(err) {
      if (err instanceof RESTError) {
        return res.status(err.status).json({
          title: err.message,
          'invalid-params': err.invalidParams
        })
      }
      else {
        return res.status('500').json({
          title: err.message,
          'invalid-params': []
        })
      }
    }

    // return success
    return res.json({})
});


app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
