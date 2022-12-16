const connectionsElem = document.getElementById("connections")
const messagesSentElem = document.getElementById("messagesSent")
const followingElem = document.getElementById("following")
const loginWarningElem = document.getElementById("loginWarning")
const metricsContainer = document.getElementById("metricsContainer")
const chartsContainer = document.getElementById("chartsContainer")

function main() {
    console.log("popup.js")
    updateMetrics()

    chrome.storage.local.get('isLoggedIn').then(res => {
        console.log("loggedIn: " + true)
        if (!res.isLoggedIn) {
            loginWarningElem.innerText = "Please Login to linkedIn"
            metricsContainer.style.display = 'none'
            chartsContainer.style.display = 'none'
        }
    })
        
    chrome.runtime.sendMessage({flag: 'updateValues'})

    chrome.runtime.onMessage.addListener(async ({flag}, sender, sendResponse) => {
        if (flag !== 'updatedValues') return;
        await updateMetrics();
    })

    drawCharts()
}

async function updateMetrics() {
    let connectionsCount = await chrome.storage.local.get('connectionsCount').then(res => res.connectionsCount)
    let messagesSent = await chrome.storage.local.get('messagesSent').then(res => res.messagesSent)
    let followingCount = await chrome.storage.local.get('followingCount').then(res => res.followingCount)
    connectionsElem.innerText = connectionsCount ? connectionsCount : 'updating...'
    messagesSentElem.innerText = messagesSent ? messagesSent : 'updating...'
    followingElem.innerText = followingCount ? followingCount : 'updating...'
    loginWarningElem.innerText = ''
}

function getPastWeekDates() {
    let dates = []
    for (let i = 0; i < 7; ++i) {
        dates.push( (new Date(Date.now() - i*24*60*60*1000/*1day*/)).toDateString() )
    }
    dates.reverse();
    return dates;
}

async function getPastWeekMetrics(dates) {
    let connectionsCountList = []
    let followingCountList = []
    let messagesSentList = []
    const profileId = await chrome.storage.local.get('profileId').then(res => res.profileId)

    for (let date of dates) {
        let key = `${profileId}@${date}`
        let recordStr = await chrome.storage.local.get(key).then(res => res[key])
        let record = recordStr ? JSON.parse(recordStr) : {}
        connectionsCountList.push(record.connectionsCount ? record.connectionsCount : 0)
        followingCountList.push(record.followingCount ? record.followingCount : 0)
        messagesSentList.push(record.messagesSent ? record.messagesSent : 0)
    }
    return {
        connectionsCountList,
        followingCountList,
        messagesSentList
    }
}

function drawChart({canvasId, xValues, yValues, color, title}) {
    new Chart(canvasId, {
        type: "bar",
        data: {
          labels: xValues,
          datasets: [{
            backgroundColor: color,
            data: yValues
          }]
        },
        options: {
          legend: {display: false},
          title: {
            display: true,
            text: title
          }
        }
      });
}

async function drawCharts() {
    console.log("Drawing Charts")
    const pastWeekDates = getPastWeekDates()
    const {
        connectionsCountList,
        followingCountList,
        messagesSentList
    } = await getPastWeekMetrics(pastWeekDates)

    drawChart({
        canvasId: 'connectionsChart',
        xValues: pastWeekDates,
        yValues: connectionsCountList,
        color: 'red',
        title: 'Connections Count on Date'
    })

    drawChart({
        canvasId: 'messagesSentChart',
        xValues: pastWeekDates,
        yValues: messagesSentList,
        color: 'green',
        title: 'Messages Sent on Date'
    })

    drawChart({
        canvasId: 'followingChart',
        xValues: pastWeekDates,
        yValues: followingCountList,
        color: 'blue',
        title: 'Following on Date'
    })
}

main()
// var xValues = ["ne","ne","ne","ne","ne","ne","ne",];
// var yValues = [55, 49, 44, 24, 15, 10, 8];
// new Chart("followingChart", {
//     type: "bar",
//     data: {
//       labels: xValues,
//       datasets: [{
//         backgroundColor: "red",
//         data: yValues
//       }]
//     },
//     options: {
//       legend: {display: false},
//       title: {
//         display: true,
//         text: "Connections"
//       }
//     }
//   });
