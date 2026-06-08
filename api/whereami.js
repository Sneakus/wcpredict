export default function handler(req, res) {
  const country = req.headers['cf-ipcountry'] || ''
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ country })
}
