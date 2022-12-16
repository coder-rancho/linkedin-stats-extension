chrome.runtime.onMessage.addListener( async ({flag}, sender, sendResponse) => {

    if (flag !== 'updateValues') return;

    if (!await getChromeStorage('isLoggedIn')) return;

    await updateConnectionsCount();
    await updateFollowingCount();
    await updateMessagesSent();
    await updateLastUpdatedTime();
    await updateDailyRecords();

    chrome.runtime.sendMessage({flag: 'updatedValues'})
    .then(res => console.log('Values Updated'))
    .catch(console.log)
})

async function getChromeStorage(key) {
    return await chrome.storage.local.get(key).then(res => res[key]);
}

async function updateDailyRecords() {
    const record = {
        connectionsCount: await getChromeStorage('connectionsCount'),
        followingCount: await getChromeStorage('followingCount'),
        messagesSent: await getChromeStorage('messagesSent'),
    }
    profileId = await getChromeStorage('profileId')
    let todayDate = (new Date(Date.now())).toDateString()
    let key = `${profileId}@${todayDate}`
    let value = JSON.stringify(record)
    let keyValuePair = JSON.parse(JSON.stringify({key: value}).replace('key', key))
    await chrome.storage.local.set(keyValuePair)
}

async function updateLastUpdatedTime() {
    await chrome.storage.local.set({'lastUpdated': Date.now()})
}

async function updateConnectionsCount() {
    let profileId = await getChromeStorage('profileId')
    let url = `https://www.linkedin.com/voyager/api/identity/profiles/me/networkinfo`
    let { connectionsCount } = await sendRequest(url, 'GET')
    await chrome.storage.local.set({'connectionsCount': connectionsCount})
    console.log(`connectionsCount: ${connectionsCount}`)
}

async function updateFollowingCount() {
    let profileId = await getChromeStorage('profileId')
    let url = `https://www.linkedin.com/voyager/api/identity/profiles/me/networkinfo?shouldIncludeFollowingCount=true`
    let followingCount = (await sendRequest(url, 'GET')).followingInfo.followingCount
    await chrome.storage.local.set({'followingCount': followingCount})
    console.log(`followingCount: ${followingCount}`)
}

async function getConversations() {
    let conversations = []
    let url = "https://www.linkedin.com/voyager/api/messaging/conversations"
    let conversationsData = await sendRequest(url, 'GET') // Default: Recent 20 conversations

    for (let element of conversationsData.elements) {
        conversations.push(element)
    }

    return conversations;

    /* PAGINATION ISN'T WORKING

    let startFrom = 0;
    let count = 20;
    let hasMore = true;
    let conversations = []
    while (hasMore) {
        let url = `https://www.linkedin.com/voyager/api/messaging/conversations?start=${startFrom}&&count=${count}`
        let conversationsData = await sendRequest(url, 'GET')
        for (let element of conversationsData.elements) conversations.push(element)
        startFrom += count;
        hasMore = conversationsData.elements.length < count ? false : true;
    }
    return conversations;
    */
}

async function getConversationIds(conversations) {
    let convIds = []
    for (let conversation of conversations) {
        let entityUrn = conversation.entityUrn;
        let convId = entityUrn.substring('urn:li:fs_conversation:'.length)
        convIds.push(convId)
    }
    return convIds;
}

async function getMessageEvents(convId) {
    let msgEvents = []
    let url = `https://www.linkedin.com/voyager/api/messaging/conversations/${convId}/events`
    let msgEventsData = await sendRequest(url, 'GET') // Default: Recent 20 msgs

    for (let element of msgEventsData.elements) {
        msgEvents.push(element)
    }

    return msgEvents;

    /* PAGINATION ISN'T WORKING.

    let startFrom = 0;
    let count = 20;
    let hasMore = true;
    let msgEvents = []
    while (hasMore) {
        let url = `https://www.linkedin.com/voyager/api/messaging/conversations/${convId}/events?start=${startFrom}&&count=${count}`
        let msgEventsData = await sendRequest(url, 'GET')
        for (let element of msgEventsData.elements) msgEvents.push(element)
        startFrom += count;
        hasMore = msgEventsData.elements.length < count ? false : true;
    }
    return msgEvents;
    */
}

function isSentByMe(myProfileId, messageEvent) {
    let fromEntityUrn = messageEvent.from['com.linkedin.voyager.messaging.MessagingMember'].miniProfile.entityUrn
    let myEntityUrn = `urn:li:fs_miniProfile:${myProfileId}`
    return fromEntityUrn === myEntityUrn
}

async function updateMessagesSent() {
    let conversations = await getConversations();
    let convIds = await getConversationIds(conversations)
    let profileId = await getChromeStorage('profileId');
    let messagesSent = 0;

    for (let convId of convIds) {
        let msgEvents = await getMessageEvents(convId)
        for (let msgEvent of msgEvents) {
            messagesSent += isSentByMe(profileId, msgEvent) ? 1 : 0;
        }
    }
    await chrome.storage.local.set({'messagesSent': messagesSent})
    console.log(`messagesSent: ${messagesSent}`)
}

async function sendRequest(url, method) {
    let csrfToken = await getChromeStorage('csrfToken')
    console.log(`[${method}] ${url}`)
    return fetch(url, {
        method: method,
        headers: {
            'csrf-token': csrfToken
        }
    })
    .then(res => res.json())
    .catch(console.log)
}