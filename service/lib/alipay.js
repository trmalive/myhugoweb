import crypto from 'crypto'

const GATEWAY_URL = 'https://openapi.alipay.com/gateway.do'

function sign(params, privateKey) {
  const sorted = Object.keys(params).sort()
  const str = sorted.map(k => `${k}=${params[k]}`).join('&')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(str, 'utf8')
  return sign.sign(privateKey, 'base64')
}

function verifySign(params, publicKey) {
  const sign = params.sign
  delete params.sign
  delete params.sign_type
  const sorted = Object.keys(params).sort()
  const str = sorted.map(k => `${k}=${params[k]}`).join('&')
  const verify = crypto.createVerify('RSA-SHA256')
  verify.update(str, 'utf8')
  return verify.verify(publicKey, sign, 'base64')
}

export async function createQrCode({ outTradeNo, totalAmount, subject }) {
  const bizContent = {
    out_trade_no: outTradeNo,
    total_amount: totalAmount.toFixed(2),
    subject: subject,
    qr_code_mode: '0',
  }

  const params = {
    app_id: process.env.ALIPAY_APP_ID,
    method: 'alipay.trade.precreate',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
    version: '1.0',
    biz_content: JSON.stringify(bizContent),
    notify_url: process.env.ALIPAY_NOTIFY_URL,
  }

  params.sign = sign(params, process.env.ALIPAY_PRIVATE_KEY)

  const query = new URLSearchParams(params).toString()
  const url = `${GATEWAY_URL}?${query}`

  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  const text = await res.text()
  const result = parseQueryString(text)

  const response = JSON.parse(result.response || '{}')

  if (response.code === '10000') {
    return { qrCode: response.qr_code, outTradeNo }
  }
  throw new Error(`支付宝创建订单失败: ${response.sub_msg || response.msg}`)
}

export async function queryOrder(outTradeNo) {
  const bizContent = { out_trade_no: outTradeNo }

  const params = {
    app_id: process.env.ALIPAY_APP_ID,
    method: 'alipay.trade.query',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
    version: '1.0',
    biz_content: JSON.stringify(bizContent),
  }

  params.sign = sign(params, process.env.ALIPAY_PRIVATE_KEY)

  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${GATEWAY_URL}?${query}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  const text = await res.text()
  const result = parseQueryString(text)
  return JSON.parse(result.response || '{}')
}

export function verifyNotify(params) {
  return verifySign({ ...params }, process.env.ALIPAY_PUBLIC_KEY)
}

function parseQueryString(str) {
  const result = {}
  str.split('&').forEach(pair => {
    const [key, ...rest] = pair.split('=')
    result[key] = decodeURIComponent(rest.join('='))
  })
  return result
}
