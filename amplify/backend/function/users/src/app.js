/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["WEBEX_ACCESS_TOKEN"].map(secretName => process.env[secretName]),
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
	API_WEBHOOKS_APIID
	API_WEBHOOKS_APINAME
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

var express = require('express')
const { check, validationResult } = require('express-validator');
var bodyParser = require('body-parser')
var awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

const fetch = require('node-fetch')
const { v4: uuidv4 } = require('uuid')

const Device = require('./utils/Device');
const User = require('./utils/User');
const { Webex, BinaryCard } = require('./utils/Webex');
const AccessRequest = require('./utils/AccessRequest');

const { Errors, RESTError } = require('./utils/Errors');

// declare a new express app
var app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
});

app.post('/users',
  [
    check('firstName')
      .isString()
      .not().isEmpty().trim().escape()
      .withMessage("Invalid input for first name."),
    check('lastName')
      .isString()
      .not().isEmpty().trim().escape()
      .withMessage("Invalid input for last name."),
    check('guestEmail')
      .isEmail()
      .withMessage("Invalid guest email address."),
    check('organization')
      .isString()
      .not().isEmpty().trim().escape()
      .withMessage("Invalid input for organization."),
    check('hostEmail')
      .isEmail()
      .withMessage("Invalid host email address.")
  ], async function(req, res) {
    // Validate inputs
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ 
        title: 'Failed validation',
        'invalid-params': errors.array()
      })
    }

    /**
     * req.body contains the following
     * - guestEmail
     * - firstName
     * - lastName
     * - company (organization)
     */

    const guest = new User(req.body.guestEmail)
    const host = new User(req.body.hostEmail)

    try {
      await Promise.all([guest.init(guest.email), host.init(host.email)])

      // Overwrite guest values (firstName, lastName, and organization) with new values
      guest.firstName = req.body.firstName
      guest.lastName = req.body.lastName
      guest.organization = req.body.organization

      // Obtain secrets
      const WEBEX_ACCESS_TOKEN = await ssm.getParameters({
        Names: ["WEBEX_ACCESS_TOKEN"].map(secretName => process.env[secretName]),
        WithDecryption: true,
      })
      .promise()
      .then(response => response.Parameters[0].Value)
      .catch(err => {
        console.warn(err)
        throw err
      })

      // Check if Webex account exists for hostEmail if webexRoomId does not exist for user
      if (!host.webexRoomId) {
        await host.sendWebexWelcomeText(WEBEX_ACCESS_TOKEN)
      }
      
      // Create Webex Webhook if it does not exist
      if (!host.webexWebhookId) {
        const name = uuidv4()
        const resource = 'attachmentActions'
        const event = 'created'
        const targetUrl = `https://${process.env.API_WEBHOOKS_APIID}.execute-api.${process.env.REGION}.amazonaws.com/${process.env.ENV}/webhooks/webex`
        const filter = `roomId=${host.webexRoomId}`
        const secret = host.secret
        await host.createWebexWebhook(WEBEX_ACCESS_TOKEN, name, resource, event, targetUrl, filter, secret)
      }

      // Create AccessRequest
      const accessRequest = new AccessRequest(guest.accessRequestId, host.email, guest.email)
      await accessRequest.queryDynamoDB()
      accessRequest.status = 'created'

      // Send approval request with Webex card
      const title = "Guest Has Arrived"
      const accessRequestId = accessRequest.id
      const imageUrl = "https://developer.webex.com/images/webex-teams-logo.png"
      const kv = {
        Name: `${guest.firstName} ${guest.lastName}`,
        Company: `${guest.organization}`,
        Email: guest.email
      }
      const message = "Hi! Your guest has arrived and is requesting guest Wi-Fi access. Accept or decline with the following buttons."
      const trueText = "Accept"
      const falesText = "Decline"
      const approvalCard = BinaryCard(title, accessRequestId, imageUrl, kv, message, trueText, falesText)
      const markdown = 'Guest has arrived.'
      await host.sendWebexCard(WEBEX_ACCESS_TOKEN, markdown, approvalCard)

      // Commmit changes to DynamoDB
      await Promise.all([
        guest.commitToDynamoDB(guest.email),
        host.commitToDynamoDB(host.email),
        accessRequest.commitToDynamoDB()])
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
    res.sendStatus(200);
});


app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
