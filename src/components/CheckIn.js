import React, { Component }  from 'react';
import { connect } from 'react-redux'
import { compose } from 'redux'

import { API } from 'aws-amplify'

import Copyright from './Copyright';

import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

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
});

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class CheckIn extends Component {
  
  state = {
    firstName: '',
    lastName: '',
    organization: '',
    guestEmail: '',
    hostEmail: '',
    loading: false,
    result: '',
    error: {
      title: '',
      'invalid-params': []
    },
    open: false
  }

  handleSubmit = async (e) => {
    e.preventDefault()

    this.setState((previousState) => ({
      ...previousState,
      loading: true
    }))

    try {
      const data = {
        body: {
          firstName: this.state.firstName,
          lastName: this.state.lastName,
          organization: this.state.organization,
          guestEmail: this.state.guestEmail,
          hostEmail: this.state.hostEmail,
        }
      }
      await API.post('users', '/users', data)
      this.setState((previousState) => ({
        ...previousState,
        firstName: '',
        lastName: '',
        organization: '',
        guestEmail: '',
        hostEmail: '',
        loading: false,
        result: 'success',
        error: {
          title: '',
          'invalid-params': []
        },
      }))
    } catch (error) {
      console.log(error)
      if ('status' in error.response) {
        if (error.response.status === 400 || error.response.status === 404) {
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
      open: true
    }))
  }

  handleChange = (e) => {
    e.preventDefault()

    this.setState(() => ({
      [e.target.name]: e.target.value,
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
    const { firstName, lastName, organization, guestEmail, hostEmail, loading, result, error, open } = this.state;
    const invalidParams = new Map(error['invalid-params'].map(obj => [obj.param, obj.msg]))

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

export default compose(connect(),withStyles(styles),)(CheckIn)