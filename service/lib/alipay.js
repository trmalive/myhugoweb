import crypto from 'crypto'

const GATEWAY_URL = 'https://openapi.alipay.com/gateway.do'

function toPem(key, type = 'RSA PRIVATE KEY') {
  if (key.includes('-----BEGIN')) return key
  const lines = key.match(/.{1,64}/g) || ['']
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`
}

function sign(params, privateKey) {
  const sorted = Object.keys(params).sort()
  const str = sorted.map(k => `${k}=${params[k]}`).join('&')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(str, 'utf8')
  return sign.sign(toPem(privateKey), 'base64')
}

function verifySign(params, publicKey) {
  const sign = params.sign
  delete params.sign
  delete params.sign_type
  const sorted = Object.keys(params).sort()
  const str = sorted.map(k => `${k}=${params[k]}`).join('&')
  const verify = crypto.createVerify('RSA-SHA256')
  verify.update(str, 'utf8')
  return verify.verify(toPem(publicKey, 'PUBLIC KEY'), sign, 'base64')
}

function now() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
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
    timestamp: now(),
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

  const body = JSON.parse(result.response || '{}')
  const response = body.alipay_trade_precreate_response || body

  if (response.code === '10000') {
    return { qrCode: response.qr_code, outTradeNo }
  }

  const errMsg = `支付宝错误: code=${response.code} sub_msg=${response.sub_msg || '-'} msg=${response.msg || '-'}`
  console.error(errMsg, 'raw:', text.substring(0, 500))
  throw new Error(`支付宝创建订单失败: ${response.sub_msg || response.msg || '请检查支付宝配置'}`)
}

export async function queryOrder(outTradeNo) {
  const bizContent = { out_trade_no: outTradeNo }

  const params = {
    app_id: process.env.ALIPAY_APP_ID,
    method: 'alipay.trade.query',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: now(),
    version: '1.0',
    biz_content: JSON.stringify(bizContent),
  }

  params.sign = sign(params, process.env.ALIPAY_PRIVATE_KEY)

  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${GATEWAY_URL}?${query}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  const text = await res.text()
  const result = parseQueryString(text)
  const body = JSON.parse(result.response || '{}')
  return body.alipay_trade_query_response || body
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
