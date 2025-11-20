const getFirefoxUserAgent = () => {
  if (process.platform === 'darwin') {
    return 'Macintosh; Intel Mac OS X 10.15'
  } else if (process.platform === 'win32') {
    return 'Windows NT 10.0; Win64; x64'
  } else {
    return 'X11; Linux x86_64'
  }
}

const getChromeUserAgent = () => {
  if (process.platform === 'darwin') {
    return `Macintosh; Intel Mac OS X 10_15_7`
  } else if (process.platform === 'win32') {
    return `Windows NT 10.0; Win64; x64`
  } else {
    return `X11; Linux x86_64`
  }
}

const FIREFOX_USER_AGENT = `Mozilla/5.0 (${getFirefoxUserAgent()}; rv:145.0) Gecko/20100101 Firefox/145.0`
const CHROME_USER_AGENT = `Mozilla/5.0 (${getChromeUserAgent()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`

module.exports = {
  FIREFOX_USER_AGENT,
  CHROME_USER_AGENT
}
