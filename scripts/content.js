function readCookie(cookie, name) { // name = "JSESSIONID"
    let nameEQ = name + "=";
    let ca = cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) == 0) {
            return c.substring(nameEQ.length, c.length).replace(/"+/g, '');
        }
    }
    return null;
}

function readProfileId(entityUrn) {
    let startIndex = "urn:li:fs_miniProfile:".length
    return entityUrn.substring(startIndex)
}

async function updateValues() {
    await chrome.runtime.sendMessage({flag: 'updateValues'})
}

const main = async () => {

    setInterval(() => {
        console.log("Periodic values updating...")
        updateValues();
    }, 10*60*1000/*10mins*/);

    const prev = await chrome.storage.local.get('csrfToken')
    const updatedCsrfToken = readCookie(document.cookie, "JSESSIONID")
    const liap = readCookie(document.cookie, "liap")
    
    if (liap !== "true") {
        await chrome.storage.local.set({isLoggedIn: false})
        return;
    }

    if (prev.csrfToken === updatedCsrfToken) return; 

    await chrome.storage.local.set({csrfToken: updatedCsrfToken})
    await chrome.storage.local.set({isLoggedIn: true})

    let res = await fetch('https://www.linkedin.com/voyager/api/me', {
        method: 'GET',
        headers: {
            'csrf-token': updatedCsrfToken
        }
    })
    .then(res => res.json())
    .catch( err => {
        console.log();
    })

    let profileId = readProfileId(res.miniProfile.entityUrn)
    await chrome.storage.local.set({profileId: profileId})
    updateValues()
}

main()