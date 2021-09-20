import React, { Component }  from 'react';
import { connect } from 'react-redux'
import { compose } from 'redux'
import CameraPhoto, { FACING_MODES, IMAGE_TYPES } from 'jslib-html5-camera-photo';

import Fab from '@material-ui/core/Fab';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import { debounce } from '@material-ui/core';

import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import CameraIcon from '@material-ui/icons/Camera';

const styles = (theme) => ({
  root: {
    height: '100vh',
    overflow: 'hidden'
  },
  fabPhoto: {
    position: 'absolute',
    margin: 'auto',
    left: 0,
    right: 0,
    bottom: theme.spacing(4)
  },
  fabBack: {
    position: 'absolute',
    backgroundColor: "transparent",
    boxShadow: "none",
    "&:hover": {
      backgroundColor: "transparent",
      boxShadow: "none",
    }
  },
})

class Camera extends Component {
  constructor (props, context) {
    super(props)

    this.state = {
      context: context,
      dataUri: '',
      cameraSettings: {},
      cameraViewStyle: {}
    }

    this.updateDimensions = this.updateDimensions.bind(this)
    this.delayedCallback = debounce(this.updateDimensions, 1000)

    this.cameraPhoto = null
    this.handleCloseCamera = () => {
      this.stopCamera()
      this.props.closeCamera()
    }
    this.handleTakePhoto = () => {
      this.props.updateUri(this.takePhoto())
      this.handleCloseCamera()
    }
    this.videoRef = React.createRef()
  }

  componentDidMount () {
    // We need to instantiate CameraPhoto inside componentDidMount because we
    // need the refs.video to get the videoElement so the component has to be
    // mounted.
    this.cameraPhoto = new CameraPhoto(this.videoRef.current);
    this.cameraPhoto.startCamera(FACING_MODES.USER)
      .then(() => {
        const cameraSettings = this.cameraPhoto.getCameraSettings()
        this.updateDimensions(cameraSettings)
        this.setState((previousState) => ({
          ...previousState,
          cameraSettings: cameraSettings
        }))
      })
      // window.addEventListener('resize', this.updateDimensions)
      window.addEventListener('resize', this.delayedCallback)
  }

  componentWillUnmount() {
    // window.removeEventListener('resize', this.updateDimensions)
    window.removeEventListener('resize', this.delayedCallback)
  }

  updateDimensions(cameraSettings) {
    console.log(cameraSettings)
    cameraSettings = 'width' in cameraSettings ? cameraSettings : this.state.cameraSettings
    let cHeight, cWidth, wHeight, wWidth = 0
    if (cameraSettings) {
      cHeight = cameraSettings.height
      cWidth = cameraSettings.width
      console.log('camera', cHeight, cWidth)
    }

    wHeight = window.innerHeight
    wWidth = window.innerWidth

    console.log(navigator.userAgent)
    console.log('screen', window.screen.height, window.screen.width)
    console.log('window', wHeight, wWidth)

    if (wHeight/cHeight >= wWidth/cWidth) {
      console.log('white space on top/bottom, change maxWidth to none, maxHeight to 100vh, need to adjust left')
      this.setState((previousState) => ({
        ...previousState,
        cameraViewStyle: {
          marginLeft: `-${(cWidth*(wHeight/cHeight)-wWidth)/2}px`,
          marginTop: 0,
          maxHeight: '100vh',
          maxWidth: 'none'
        }
      }))
    }
    else {
      console.log('white space on left/right, x-overflow, need to adjust top')
      this.setState((previousState) => ({
        ...previousState,
        cameraViewStyle: {
          marginLeft: '0px',
          marginTop: `-${(cHeight*(wWidth/cWidth)-wHeight)/2}px`,
          maxHeight: 'none',
          maxWidth: '100vw',
        }
      }))
    }
  }

  startCamera (idealFacingMode, idealResolution) {
    this.cameraPhoto.startCamera(idealFacingMode, idealResolution)
      .then(() => {
        console.log('camera is started !');
      })
      .catch((error) => {
        console.error('Camera not started!', error);
      });
  }

  stopCamera () {
    this.cameraPhoto.stopCamera()
      .then(() => {
        console.log('Camera stoped!');
      })
      .catch((error) => {
        console.log('No camera to stop!:', error);
      });
  }

  takePhoto () {
    const config = {
      sizeFactor: 1,
      imageType : IMAGE_TYPES.JPG
    }
    return this.cameraPhoto.getDataUri(config)
  }

  render () {
    const { classes } = this.props
    const { marginLeft, marginTop, maxHeight, maxWidth } = this.state.cameraViewStyle

    return (
      <Grid container component="main" className={classes.root}>
        <Grid item xs={12} component="video" ref={this.videoRef} autoPlay playsInline style={{
          marginLeft: marginLeft,
          marginTop: marginTop,
          maxHeight: maxHeight,
          maxWidth: maxWidth,
          zIndex: -1,
        }}></Grid>
        <Fab color="primary" aria-label="add" className={classes.fabPhoto} onClick={() => this.handleTakePhoto()}>
          <CameraIcon fontSize="large"/>
        </Fab>
        <Fab color="primary" aria-label="add" className={classes.fabBack} onClick={this.handleCloseCamera}>
          <ArrowBackIcon fontSize="large"/>
        </Fab>
      </Grid>
    );
  }
}

export default compose(connect(),withStyles(styles),)(Camera)