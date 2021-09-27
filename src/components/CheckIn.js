import React, { Component }  from 'react';
import { connect } from 'react-redux'
import { compose } from 'redux'

import { API } from 'aws-amplify'

import Camera from './Camera'
import Copyright from './Copyright';

import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import AddAPhotoOutlinedIcon from '@material-ui/icons/AddAPhotoOutlined';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';

import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
// BLAZEFACE: import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs-core';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';

tfjsWasm.setWasmPaths(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`)

const styles = (theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  photoIcon: {
    margin: theme.spacing(1),
    fontSize: 40,
    color: "rgba(0, 0, 0, 0.54)"
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(3),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
  boxCamera: {
    borderRadius: '4px',
    width: '100%',
    minHeight: '120px',
    backgroundColor: 'transparent'
  },
  formSection: {
    textAlign: 'left'
  },
  buttonProgress: {
    color: theme.palette.primary.main,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  largeAvatar: {
    margin: theme.spacing(1),
    width: theme.spacing(10),
    height: theme.spacing(10)
  },
});

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class CheckIn extends Component {
  
  state = {
    error: {
      title: '',
      'invalid-params': []
    },
    firstName: '',
    guestEmail: '',
    hostEmail: '',
    isCameraView: false,
    isFace: null,
    isOpen: false,
    lastName: '',
    loading: false,
    organization: '',
    numberOfFaces: 0,
    result: '',
    uri: null,
  }

  cameraInput = React.createRef()
  focusCameraInput = () => this.cameraInput.current.click()

  closeCamera = () => {
    this.setState((previousState) => ({
      ...previousState,
      isCameraView: false
    }))
  }

  handleCameraInputChange = (e) => {
    e.preventDefault()
    const fileUploaded = e.target.files[0]
    this.updateUri(URL.createObjectURL(fileUploaded))
  }

  handleCloseError = (e) => {
    this.setState((previousState) => ({
      ...previousState,
      isOpen: false
    }))
  }

  handleChange = (e) => {
    e.preventDefault()

    this.setState(() => ({
      [e.target.name]: e.target.value,
    }))
  }

  handleOpenCamera = (e) => {
    e.preventDefault()

    this.setState((previousState) => ({
      ...previousState,
      isCameraView: true
    }))
  }

  handleSubmit = async (e) => {
    e.preventDefault()

    this.setState((previousState) => ({
      ...previousState,
      loading: true
    }))

    try {
      // Create body to POST
      const data = {
        body: {
          photo: this.state.isFace && this.state.numberOfFaces === 1 ? this.state.uri : null,
          firstName: this.state.firstName,
          guestEmail: this.state.guestEmail,
          hostEmail: this.state.hostEmail,
          lastName: this.state.lastName,
          organization: this.state.organization,
        }
      }
      // Send data
      await API.post('users', '/users', data)
      // Reset state
      this.setState((previousState) => ({
        ...previousState,
        error: {
          title: '',
          'invalid-params': []
        },
        firstName: '',
        guestEmail: '',
        hostEmail: '',
        isFace: null,
        lastName: '',
        loading: false,
        organization: '',
        result: 'success',
        uri: null,
      }))
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400 || error.response.status === 422 || error.response.status === 404) {
          const errors = error.response.data
          console.log(errors)
          this.setState((previousState) => ({
            ...previousState,
            result: 'failure',
            error: {
              title: errors.title,
              'invalid-params': errors['invalid-params']
            }
          }))
        }
        else {
          this.setState((previousState) => ({
            ...previousState,
            result: 'failure',
            error: {
              title: 'An internal server error occurred. Please contact the administrator.',
              'invalid-params': []
            }
          }))
        }
      }
      else {
        console.log(error)
        console.log(error.status)
        this.setState((previousState) => ({
          ...previousState,
          result: 'failure',
          error: {
            title: 'An internal server error occurred. Please contact the administrator.',
            'invalid-params': []
          }
        }))
      }
    }

    this.setState((previousState) => ({
      ...previousState,
      loading: false,
      isOpen: true
    }))
  }

  updateUri = (uri) => {
    let img = new Image()

    this.setState((previousState) => ({
      ...previousState,
      isFace: null,
      uri: null,
      numberOfFaces: 0
    }))

    // Create a canvas to crop image
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    img.onload = async () => {
      // Validate face
      try {
        await tf.setBackend('wasm')
        // BLAZEFACE: const model = await blazeface.load()
        // BLAZEFACE: const returnTensors = false
        // BLAZEFACE: const predictions = await model.estimateFaces(img, returnTensors)
        const model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh)
        const predictions = await model.estimateFaces({input: img})
        console.log(predictions)
        if (predictions.length === 1) {
          // BLAZEFACE: const prediction = predictions[0]
          const prediction = predictions[0].boundingBox
          // Obtain source x and y from topLeft
          let sx = prediction.topLeft[0]
          let sy = prediction.topLeft[1]

          // Calculate the width and height of the prediction
          const sWidth = prediction.bottomRight[0] - prediction.topLeft[0]
          const sHeight = prediction.bottomRight[1] - prediction.topLeft[1]
          // Calculate the center of the prediction
          const cx = sx + sWidth / 2
          const cy = sy + sHeight / 2
          // To capture the entire face, expand from the center.
          // Calculate the length of the square and expand by 1.7 times.
          // If the length is greater than sWidth or sHeight, then select the smallest
          let l = Math.min(sHeight, sHeight) * 1.7
          l = Math.min(l, img.width, img.height)

          // Calculate new sx and sy (topRight) based on caluclated length
          sx = cx - l / 2 > 0 ? cx - l / 2 : 0
          sy = cy - l / 2 > 0 ? cy - l / 2 : 0
          // Check sx + l and sx + l (bottomLeft) is smaller than img.width and img.height
          if (sx + l > img.width) {
            sx = img.width - l
          }
          if (sy + l > img.height) {
            sy = img.height - l
          }

          // Rewrite the canvas width and height
          canvas.width = l
          canvas.height = l
          ctx.drawImage(img, sx, sy, l, l, 0, 0, l, l)
          // Export the image of the face
          uri = canvas.toDataURL('image/jpeg')
          this.setState((previousState) => ({
            ...previousState,
            isFace: true,
            numberOfFaces: 1,
            uri: uri
          }))
        }
        else if (predictions.length > 1) {
          console.log('Too many faces detected')
          this.setState((previousState) => ({
            ...previousState,
            isFace: true,
            numberOfFaces: predictions.length,
            uri: uri
          }))
        }
        else {
          console.log('No faces detected')
          this.setState((previousState) => ({
            ...previousState,
            isFace: false,
            numberOfFaces: 0,
            uri: uri
          }))
        }
      } catch(err) {
        console.log(err)
      }
    }

    img.src = uri
  }

  render() {

    const { classes } = this.props;
    const { firstName, lastName, organization, guestEmail, hostEmail, loading, result, error, isOpen, uri, isCameraView, numberOfFaces, isFace } = this.state
    const invalidParams = new Map(error['invalid-params'].map(obj => [obj.param, obj.msg]))
    const smartphone = /iPad|iPhone|iPod|Android/.test(navigator.userAgent) && !window.MSStream

    if (isCameraView) {
      return (
        <Camera
          closeCamera={this.closeCamera}
          updateUri={this.updateUri}
        />
      )
    }
    else {
      return (
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <div className={classes.paper}>
            <Avatar className={classes.avatar}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Check In
            </Typography>
            <form className={classes.form} onSubmit={this.handleSubmit} noValidate autoComplete="off">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom className={classes.formSection}>
                    Guest
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    helperText={invalidParams.has('firstName') ? invalidParams.get('firstName') : ''}
                    disabled={loading}
                    error={invalidParams.has('firstName')}
                    value={firstName}
                    onChange={this.handleChange}
                    name="firstName"
                    variant="outlined"
                    required
                    fullWidth
                    id="firstName"
                    label="First Name"
                    autoFocus
                    InputProps={{
                      readOnly: loading
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    helperText={invalidParams.has('lastName') ? invalidParams.get('lastName') : ''}
                    disabled={loading}
                    error={invalidParams.has('lastName')}
                    value={lastName}
                    onChange={this.handleChange}
                    variant="outlined"
                    required
                    fullWidth
                    id="lastName"
                    label="Last Name"
                    name="lastName"
                    InputProps={{
                      readOnly: loading,
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    helperText={invalidParams.has('guestEmail') ? invalidParams.get('guestEmail') : ''}
                    disabled={loading}
                    error={invalidParams.has('guestEmail')}
                    value={guestEmail}
                    onChange={this.handleChange}
                    variant="outlined"
                    required
                    fullWidth
                    id="guestEmail"
                    label="Email Address"
                    name="guestEmail"
                    InputProps={{
                      readOnly: loading,
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    helperText={invalidParams.has('organization') ? invalidParams.get('organization') : ''}
                    disabled={loading}
                    error={invalidParams.has('organization')}
                    value={organization}
                    onChange={this.handleChange}
                    variant="outlined"
                    required
                    fullWidth
                    id="organization"
                    label="Organization"
                    name="organization"
                    InputProps={{
                      readOnly: loading,
                    }}
                  />
                </Grid>
                <Grid item xs={12} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'}}
                >
                  <Box
                    borderColor={"rgba(0, 0, 0, 0.23)"}
                    variant="contained"
                    color="primary"
                    className={classes.boxCamera}
                  >
                    <input accept="image/*" id="icon-button-file" type="file" capture="user" ref={this.cameraInput} style={{display: 'none'}} onChange={ this.handleCameraInputChange }/>
                    <Typography style={{
                      color: "rgba(0, 0, 0, 0.54)",
                      textAlign: 'left',
                      paddingTop: '18.5px',
                      paddingLeft: '14px'}}>
                      Photo
                    </Typography>
                    { !isFace && uri && (
                      <Typography style={{
                        color: "rgba(255, 0, 0, 1)",
                        textAlign: 'left',
                        paddingTop: '18.5px',
                        paddingLeft: '14px',
                        fontSize: '0.75rem'}}>
                        No face in photo. Retake if required.
                      </Typography>
                    )}
                    { isFace && numberOfFaces > 1 && (
                      <Typography style={{
                        color: "rgba(255, 0, 0, 1)",
                        textAlign: 'left',
                        paddingTop: '18.5px',
                        paddingLeft: '14px',
                        fontSize: '0.75rem'}}>
                        Multiple faces detected in photo. Make sure there's only you in the photo. Retake if required.
                      </Typography>
                    )}
                    { uri === null && (
                      <AddAPhotoOutlinedIcon className={classes.photoIcon} onClick={smartphone ? this.focusCameraInput : this.handleOpenCamera}/>
                    )}
                    { uri !== null && (
                      <Avatar alt="Your photo" src={uri} className={classes.largeAvatar} style={{display: 'inline-flex'}} onClick={smartphone ? this.focusCameraInput : this.handleOpenCamera}/>
                    )}
                  </Box>
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom className={classes.formSection}>
                    Host
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    helperText={invalidParams.has('hostEmail') ? invalidParams.get('hostEmail') : ''}
                    disabled={loading}
                    error={invalidParams.has('hostEmail')}
                    value={hostEmail}
                    onChange={this.handleChange}
                    variant="outlined"
                    required
                    fullWidth
                    id="hostEmail"
                    label="Email Address"
                    name="hostEmail"
                    InputProps={{
                      readOnly: loading,
                    }}
                  />
                </Grid>
              </Grid>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                className={classes.submit}
                disabled={loading || firstName.length <= 0 || lastName.length <= 0 || organization.length <= 0 || guestEmail.length <= 0 || hostEmail.length <= 0}
              >
                Check In
                {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
              </Button>
            </form>
          </div>
          <Box mt={5}>
            <Copyright />
          </Box>
          { result === 'failure' && (
            <Snackbar open={isOpen} onClose={this.handleCloseError}>
              <Alert onClose={this.handleCloseError} severity="error">
                { error.title }
              </Alert>
            </Snackbar>
          )}
          { result === 'success' && (
            <Snackbar open={isOpen} autoHideDuration={6000} onClose={this.handleCloseError}>
              <Alert onClose={this.handleCloseError} severity="success">
                Success!
              </Alert>
            </Snackbar>
          )}
        </Container>
      )
    }
  }
}

export default compose(connect(),withStyles(styles),)(CheckIn)