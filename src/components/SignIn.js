import React, { Component } from 'react';
import { connect } from 'react-redux'
import { compose } from 'redux'

import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import Link from '@material-ui/core/Link';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';

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
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
  wrapper: {
    position: 'relative',
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

class SignIn extends Component {

  state = {
    email: '',
    password: '',
    loading: false
  }

  handleChange = (e) => {
    e.preventDefault()

    this.setState(() => ({
      [e.target.name]: e.target.value,
    }))
  }

  handleSubmit = (e) => {
    this.setState((previousState) => ({
      ...previousState,
      loading: true
    }))
  }

  render() {

    const { classes } = this.props;
    const { email, password, loading } = this.state;

    const params = new URLSearchParams(this.props.location.search);
    const loginUrl = params.get('login_url');
    const error = params.get('error_message');

    return (
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <div className={classes.paper}>
          <Avatar className={classes.avatar}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in
          </Typography>
          <form method='POST' onSubmit={this.handleSubmit} action={loginUrl} className={classes.form} noValidate>
            <TextField
              value='google.com'
              id='success_url'
              type='hidden'
            />
            <TextField
              error={error!==null}
              value={email}
              onChange={this.handleChange}
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              helperText={error}
            />
            <TextField
              error={error!==null}
              value={password}
              onChange={this.handleChange}
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
            />
            <div className={classes.wrapper}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                className={classes.submit}
                disabled={loading || email <= 0 || password <= 0}
              >
                Sign In
                {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
              </Button>
            </div>
            <Grid container>
              {/*
              <Grid item xs>
                <Link href="#" variant="body2">
                  Forgot password?
                </Link>
              </Grid> 
              */}
              <Grid item>
                <Link href="/checkin" variant="body2">
                  {"Don't have an account? Check In"}
                </Link>
              </Grid>
            </Grid>
          </form>
        </div>
        <Box mt={8}>
          <Copyright />
        </Box>
      </Container>
    )
  }
}

export default compose(connect(),withStyles(styles),)(SignIn)