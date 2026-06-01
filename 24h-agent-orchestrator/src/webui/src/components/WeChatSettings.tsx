import React, { useState, useEffect, useRef } from 'react'
import { FormattedMessage } from 'react-intl'

interface WechatLoginInfo {
  token: string
  userId: string
  accountId: string
  loginAt: string
}

interface WechatConfigData {
  baseUrl: string
  cdnBaseUrl: string
  botType: string
  consoleToWechat: boolean
  loginInfo: WechatLoginInfo | null
}

export function WeChatSettings() {
  const [config, setConfig] = useState<WechatConfigData>({
    baseUrl: 'https://ilinkai.weixin.qq.com',
    cdnBaseUrl: 'https://novac2c.cdn.weixin.qq.com/c2c',
    botType: '3',
    consoleToWechat: false,
    loginInfo: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<'saved' | 'error' | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [qrCodeImg, setQrCodeImg] = useState<string | null>(null)
  const [qrCodeId, setQrCodeId] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [qrStatus, setQrStatus] = useState<string | null>(null)
  const [testSending, setTestSending] = useState(false)
  const [testMsg, setTestMsg] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  useEffect(() => {
    fetch('/api/wechat/config')
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json() })
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load WeChat config', err))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/wechat/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          cdnBaseUrl: config.cdnBaseUrl,
          botType: config.botType,
          consoleToWechat: config.consoleToWechat,
        }),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      setSaveMsg('saved')
      setTimeout(() => setSaveMsg(null), 2000)
    } catch (err) {
      console.error('Failed to save WeChat config', err)
      setSaveMsg('error')
      setTimeout(() => setSaveMsg(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const startQrPolling = (qrcode: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/wechat/qrcode/status?qrcode=${encodeURIComponent(qrcode)}`)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const data = await res.json()
        setQrStatus(data.status)
        if (data.status === 'confirmed' && data.loginInfo) {
          setConfig((prev) => ({ ...prev, loginInfo: data.loginInfo }))
          setQrCodeImg(null)
          setQrCodeId(null)
          setLoggingIn(false)
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
        } else if (data.status === 'expired') {
          setLoginError('QR code expired, please try again')
          setQrCodeImg(null)
          setQrCodeId(null)
          setLoggingIn(false)
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch (err) {
        console.error('QR status poll failed', err)
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        setLoggingIn(false)
      }
    }, 1500)
  }

  const handleGetQrCode = async () => {
    setLoggingIn(true)
    setLoginError(null)
    setQrCodeImg(null)
    setQrCodeId(null)
    setQrStatus(null)
    try {
      const res = await fetch('/api/wechat/qrcode', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to get QR code')
      }
      const data = await res.json()
      setQrCodeImg(data.qrcodeImg)
      setQrCodeId(data.qrcode)
      startQrPolling(data.qrcode)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Failed to get QR code')
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/wechat/logout', { method: 'POST' })
      setConfig((prev) => ({ ...prev, loginInfo: null }))
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  const handleTest = async () => {
    setTestSending(true)
    setTestMsg(null)
    try {
      const res = await fetch('/api/wechat/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello from 24h Orchestrator!' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Send failed')
      }
      setTestMsg('sent')
      setTimeout(() => setTestMsg(null), 3000)
    } catch (err) {
      setTestMsg('error')
      setTimeout(() => setTestMsg(null), 3000)
    } finally {
      setTestSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px', background: '#0d1117', color: '#c9d1d9',
    border: '1px solid #30363d', borderRadius: 4, fontSize: 13, boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4,
  }

  if (loading) {
    return <div style={{ padding: 16, color: '#8b949e', fontSize: 13 }}><FormattedMessage id="projectSettings.loading" /></div>
  }

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>
        <FormattedMessage id="wechat.title" />
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Connection Settings */}
        <div>
          <label style={labelStyle}><FormattedMessage id="wechat.baseUrl" /></label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}><FormattedMessage id="wechat.cdnBaseUrl" /></label>
          <input
            type="text"
            value={config.cdnBaseUrl}
            onChange={(e) => setConfig((prev) => ({ ...prev, cdnBaseUrl: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}><FormattedMessage id="wechat.botType" /></label>
          <input
            type="text"
            value={config.botType}
            onChange={(e) => setConfig((prev) => ({ ...prev, botType: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '6px 16px', background: saving ? '#484f58' : '#238636', color: '#fff',
              border: 'none', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
            }}
          >
            <FormattedMessage id={saving ? 'projectSettings.saving' : 'projectSettings.save'} />
          </button>
          {saveMsg === 'saved' && (
            <span style={{ color: '#3fb950', fontSize: 12 }}><FormattedMessage id="projectSettings.saved" /></span>
          )}
          {saveMsg === 'error' && (
            <span style={{ color: '#f85149', fontSize: 12 }}><FormattedMessage id="projectSettings.saveError" /></span>
          )}
        </div>

        {/* QR Code Login Section */}
        <div style={{ borderTop: '1px solid #30363d', paddingTop: 12 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#c9d1d9' }}>
            <FormattedMessage id="wechat.loginStatus" />
          </h4>

          {config.loginInfo ? (
            <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.8 }}>
              <div>
                <FormattedMessage id="wechat.loggedInAs" />{' '}
                <strong style={{ color: '#58a6ff' }}>{config.loginInfo.accountId}</strong>
              </div>
              <div><FormattedMessage id="wechat.userId" />: {config.loginInfo.userId}</div>
              <div><FormattedMessage id="wechat.loginAt" />: {new Date(config.loginInfo.loginAt).toLocaleString()}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '4px 12px', background: '#da3633', color: '#fff',
                    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                  }}
                >
                  <FormattedMessage id="wechat.logout" />
                </button>
                <button
                  onClick={handleTest}
                  disabled={testSending}
                  style={{
                    padding: '4px 12px', background: testSending ? '#484f58' : '#1f6feb', color: '#fff',
                    border: 'none', borderRadius: 4, cursor: testSending ? 'not-allowed' : 'pointer', fontSize: 12,
                  }}
                >
                  {testSending ? '...' : <FormattedMessage id="wechat.testSend" />}
                </button>
                {testMsg === 'sent' && <span style={{ color: '#3fb950', fontSize: 12 }}><FormattedMessage id="wechat.testSent" /></span>}
                {testMsg === 'error' && <span style={{ color: '#f85149', fontSize: 12 }}><FormattedMessage id="wechat.testError" /></span>}
              </div>
            </div>
          ) : (
            <div>
              {!qrCodeImg ? (
                <div>
                  <div style={{ fontSize: 12, color: '#f85149', marginBottom: 8 }}>
                    <FormattedMessage id="wechat.notLoggedIn" />
                  </div>
                  <button
                    onClick={handleGetQrCode}
                    disabled={loggingIn}
                    style={{
                      padding: '6px 16px', background: loggingIn ? '#484f58' : '#238636', color: '#fff',
                      border: 'none', borderRadius: 4, cursor: loggingIn ? 'not-allowed' : 'pointer', fontSize: 13,
                    }}
                  >
                    {loggingIn ? <FormattedMessage id="wechat.loggingIn" /> : <FormattedMessage id="wechat.login" />}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={qrCodeImg}
                    alt="WeChat QR Code"
                    style={{ width: 200, height: 200, border: '1px solid #30363d', borderRadius: 4 }}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#8b949e' }}>
                    {qrStatus === 'scaned' ? (
                      <span style={{ color: '#d29922' }}>Scan detected, please confirm in WeChat...</span>
                    ) : (
                      <span>Scan the QR code with WeChat to login</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (pollRef.current) clearInterval(pollRef.current)
                      setQrCodeImg(null)
                      setQrCodeId(null)
                      setLoggingIn(false)
                      setLoginError(null)
                    }}
                    style={{
                      marginTop: 8, padding: '4px 12px', background: '#21262d', color: '#c9d1d9',
                      border: '1px solid #30363d', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {loginError && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#f85149' }}>{loginError}</div>
              )}
            </div>
          )}
        </div>

        {/* Console to WeChat toggle */}
        <div style={{ borderTop: '1px solid #30363d', paddingTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.consoleToWechat}
              onChange={(e) => setConfig((prev) => ({ ...prev, consoleToWechat: e.target.checked }))}
              style={{ accentColor: '#238636' }}
            />
            <span style={{ fontSize: 13, color: '#c9d1d9' }}>
              <FormattedMessage id="wechat.consoleToWechat" />
            </span>
          </label>
          <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4, marginLeft: 24 }}>
            <FormattedMessage id="wechat.consoleToWechatDesc" />
          </div>
        </div>
      </div>
    </div>
  )
}
