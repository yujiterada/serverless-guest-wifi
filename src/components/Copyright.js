import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';

export default function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="https://github.com/yujiterada/serverless-guest-wifi">
        Guest Wi-Fi Demo App
      {' '}
      {new Date().getFullYear()}
      {'.'}
      </Link>{' ⚡ by '}
      <Link color="inherit" href="https://apicli.com/">
        apicli
      </Link>
    </Typography>
  );
}