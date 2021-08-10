import React, { Component } from 'react';
import { connect } from 'react-redux'
import { compose } from 'redux'

import { API } from 'aws-amplify'

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

import SettingsIcon from '@material-ui/icons/Settings';
import DeleteIcon from '@material-ui/icons/Delete';
import AddCircleIcon from '@material-ui/icons/AddCircle';

import Copyright from './Copyright';

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
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(3),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
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
   button: {
    margin: theme.spacing(1),
  },
});

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class Management extends Component {

  state = {
    email: '',
    serial: '',
    loading: false,
    result: '',
    error: {
      title: '',
      'invalid-params': []
    },
    open: false,
    action: ''
  }

  handleChange = (e) => {
    e.preventDefault()

    this.setState(() => ({
      [e.target.name]: e.target.value,
    }))
  }

  handleClick = async (e, value) => {
    e.preventDefault()

    this.setState((previousState) => ({
      ...previousState,
      loading: true,
      action: value
    }))

    switch(value) {
      case 'add':
        try {
          const data = {
            body: {
              email: this.state.email,
              serial: this.state.serial,
            }
          }
          await API.post('devices', '/devices', data)
          this.setState((previousState) => ({
            ...previousState,
            email: '',
            serial: '',
            result: 'success',
            error: {
              title: '',
              'invalid-params': []
            }
          }))
        } catch(error) {
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
        break;
      case 'remove':
        try {
          const data = {
            body: {
              email: this.state.email,
              serial: this.state.serial,
            }
          }
          await API.del('devices', '/devices', data)
          this.setState((previousState) => ({
            ...previousState,
            email: '',
            serial: '',
            result: 'success',
            error: {
              title: '',
              'invalid-params': []
            }
          }))
        } catch(error) {
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
        break;
      default:
        break;
    }

    this.setState((previousState) => ({
      ...previousState,
      loading: false,
      open: true,
      action: ''
    }))
  }

  handleClose = (event) => {
    this.setState((previousState) => ({
      ...previousState,
      open: false
    }))
  };

  render() {

    const { classes } = this.props;
    const { email, serial, loading, result, error, open, action } = this.state;
    const invalidParams = new Map(error['invalid-params'].map(obj => [obj.param, obj.msg]))

    return (
      <Container component="main" maxWidth="sm">
        <CssBaseline />
        <div className={classes.paper}>
          <Avatar className={classes.avatar}>
            <SettingsIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Management
          </Typography>
          <form className={classes.form} noValidate autoComplete="off">
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom className={classes.formSection}>
                  Device
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  helperText={invalidParams.has('email') ? invalidParams.get('email') : ''}
                  disabled={loading}
                  error={invalidParams.has('email')}
                  value={email}
                  onChange={this.handleChange}
                  name="email"
                  variant="outlined"
                  required
                  fullWidth
                  id="email"
                  label="Email"
                  autoFocus
                  InputProps={{
                    readOnly: loading
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  helperText={invalidParams.has('serial') ? invalidParams.get('serial') : ''}
                  disabled={loading}
                  error={invalidParams.has('serial')}
                  value={serial}
                  onChange={this.handleChange}
                  variant="outlined"
                  required
                  fullWidth
                  id="serial"
                  label="Serial"
                  name="serial"
                  InputProps={{
                    readOnly: loading,
                  }}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2} justifyContent='flex-end'>
              <Button
                disabled={ email.length <= 0 || serial <= 0 || loading }
                variant="contained"
                color="primary"
                className={classes.button}
                startIcon={ loading  && action === 'add' ? <CircularProgress size={24} className={classes.buttonProgress} /> : <AddCircleIcon />}
                onClick={(e) => this.handleClick(e, 'add')}
              >
                Add
              </Button>
              <Button
                disabled={ email.length <= 0 || serial <= 0 || loading }
                variant="contained"
                color="secondary"
                className={classes.button}
                startIcon={ loading && action === 'remove' ? <CircularProgress size={24} className={classes.buttonProgress} /> : <DeleteIcon /> }
                onClick={(e) => this.handleClick(e, 'remove')}
              >
                Remove
              </Button>
            </Grid>
          </form>
        </div>
        <Box mt={8}>
          <Copyright />
        </Box>
        { result === 'failure' && (
          <Snackbar open={open} onClose={this.handleClose}>
            <Alert onClose={this.handleClose} severity="error">
              { error.title }
            </Alert>
          </Snackbar>
        )}
        { result === 'success' && (
          <Snackbar open={open} autoHideDuration={6000} onClose={this.handleClose}>
            <Alert onClose={this.handleClose} severity="success">
              Success!
            </Alert>
          </Snackbar>
        )}
      </Container>
    )
  }
}

export default compose(connect(),withStyles(styles),)(Management)