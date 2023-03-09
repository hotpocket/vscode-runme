import os from 'node:os'


const getLastStableRelease = async () => {
    /**
     * The latest release is the most recent non-prerelease, non-draft release
     */
    const response = await fetch('https://api.github.com/repos/stateful/runme/releases/latest', {
        headers: {
            'Accept': 'application/vnd.github+json'
        }
    })
    const { tag_name } = await response.json()
    const arch = os.arch()
    const binary = `${os.platform()}_${arch === 'x64' ? 'x86_64' : arch}.tar.gz`
    const downloadUrl = `https://download.stateful.com/runme/${tag_name.replace('v', '')}/runme_${binary}`
    // This console log is important since it's being exported to a ENV VAR
    console.log(downloadUrl)
}


await getLastStableRelease()

