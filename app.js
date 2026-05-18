const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbx1n6HDvtriCGbXZXYCJW7eUMDkO9Uex3VRXMUPq_sNo_cRpQn5m5rT1p9cputdhAWQ/exec'

const scanBtn = document.getElementById('scanBtn')

const video = document.getElementById('video')

const statusText = document.getElementById('status')

scanBtn.addEventListener('click', startScanner)

async function startScanner() {
	const codeReader = new ZXingBrowser.BrowserMultiFormatReader()

	const stream = await navigator.mediaDevices.getUserMedia({
		video: {
			facingMode: 'environment',
		},
	})

	video.srcObject = stream

	codeReader.decodeFromVideoElement(video, async (result, err) => {
		if (result) {
			const barcode = result.getText()

			statusText.textContent = barcode

			codeReader.reset()

			stream.getTracks().forEach((track) => track.stop())

			await fetchProduct(barcode)
		}
	})
}

async function fetchProduct(barcode) {
	const url = `${GAS_API_URL}?action=getProduct&barcode=${barcode}`

	const res = await fetch(url)

	const product = await res.json()

	console.log(product)

	document.getElementById('productArea').innerHTML = `

    <h2>${product.name}</h2>

    <p>${product.price}円</p>

	`
}
