import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';
import { makeStyles } from '@material-ui/core/styles';


const useStyles = makeStyles(theme => ({
  footer: {
    marginBottom: theme.spacing(8)
  }
}))

function Copyright(props) {
  const classes = useStyles(props);

  return (
    <Typography variant="body2" color="textSecondary" align="center" className={classes.footer}>
      {'Copyright © '}
      <Link color="inherit" href="https://github.com/yujiterada/serverless-guest-wifi">
        Guest Wi-Fi Demo App
      {' '}
      {new Date().getFullYear()}
      {'.'}
      </Link>{' ⚡ by '}
      <Link color="inherit" href="https://apicli.com/">
        APICLI
      </Link>
    </Typography>
  );
}

export default Copyright