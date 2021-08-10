function GuestArrivalCard(fullName, organization, email, accessRequestId, imageUrl="https://developer.webex.com/images/webex-teams-logo.png") {
  return {
    "contentType": "application/vnd.microsoft.card.adaptive",
    "content": {
      "type": "AdaptiveCard",
      "body": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "items": [
                {
                  "type": "Image",
                  "style": "Person",
                  "url": imageUrl,
                  "size": "Medium",
                  "height": "50px"
                }
              ],
              "width": "auto"
            },
            {
              "type": "Column",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "APICLI",
                  "weight": "Lighter",
                  "color": "Accent"
                },
                {
                  "type": "TextBlock",
                  "weight": "Bolder",
                  "text": "Guest Has Arrived",
                  "horizontalAlignment": "Left",
                  "wrap": true,
                  "color": "Light",
                  "size": "Large",
                  "spacing": "Small"
                }
              ],
              "width": "stretch"
            }
          ]
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": 35,
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Name",
                  "color": "Light"
                },
                {
                  "type": "TextBlock",
                  "text": "Organization",
                  "weight": "Lighter",
                  "color": "Light",
                  "spacing": "Small"
                },
                {
                  "type": "TextBlock",
                  "text": "Email",
                  "color": "Light"
                }
              ]
            },
            {
              "type": "Column",
              "width": 65,
              "items": [
                {
                  "type": "TextBlock",
                  "text": fullName,
                  "color": "Light"
                },
                {
                  "type": "TextBlock",
                  "text": organization,
                  "weight": "Lighter",
                  "color": "Light",
                  "spacing": "Small"
                },
                {
                  "type": "TextBlock",
                  "text": email,
                  "color": "Light"
                }
              ]
            }
          ],
          "spacing": "Padding",
          "horizontalAlignment": "Center"
        },
        {
          "type": "TextBlock",
          "text": "Hi! Your guest has arrived and is requesting guest Wi-Fi access.",
          "wrap": true
        },
        {
            "type": "TextBlock",
            "text": "Accept or decline Wi-Fi access with the following selection and buttons.",
            "wrap": true
        },
        {
          "type": "Input.ChoiceSet",
          "id": "duration",
          "value": "30",
          "choices": [
            {
                "title": "30 minutes",
                "value": "30"
            },
            {
                "title": "1 hour",
                "value": "60"
            },
            {
                "title": "3 hours",
                "value": "180"
            },
            {
                "title": "1 day",
                "value": "1440"
            }
          ]
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.Submit",
              "title": "Accept",
              "data": {
                "action": true,
                "id": accessRequestId
              }
            },
            {
              "type": "Action.Submit",
              "title": "Decline",
              "data": {
                "action": false,
                "id": accessRequestId
              }
            }
          ],
          "horizontalAlignment": "Right",
          "spacing": "None"
        }
      ],
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.2"
    }
  }
}

module.exports = { GuestArrivalCard }