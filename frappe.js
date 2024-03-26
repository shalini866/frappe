
const axios = require('axios');
const cron = require("node-cron");
const sql = require('mssql')
require('dotenv').config();
cron.schedule("0 */1 6-23 * * *", async function () {
    console.log("starting")
       let date = new Date('2024-03-25');
       let startDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 00:00:00.000`;
       let endDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59.000`;
       var faceQuery = `select * from DeviceLogs_${date.getMonth() + 1}_${date.getFullYear()} where LogDate > '${startDate}' and LogDate < '${endDate}' order by UserId desc`;
    //    var fullTime = new Date().getTime();
   
       
    //     var faceQuery = `select * from DeviceLogs_3_2024 where LogDate > '2024-03-04 00:00:00.000' and LogDate < '2024-03-04 23:59:59.000'  and UserId = '301096' order by UserId desc`;
    //     var fullTime = 1709787331024;
   
        // await checkInOutUpdate(faceQuery, fullTime);
       frappecheckInOut(faceQuery)
   });
const config = {
    user: process.env.Mssql_User,
    password: process.env.Mssql_Password,
    server: process.env.Mssql_Server,
    database: process.env.Mssql_Database,
    options: {
        encrypt: false,
        enableArithAbort: true,
    },
};

async function frappecheckInOut(faceQuery) {
    const pool = new sql.ConnectionPool(config);
    try {
        await pool.connect();
        const result = await pool.request().query(faceQuery);  
        //  console.log(result)  
        const mappedResult = result.recordset.map(({ UserId, Direction, LogDate }) => ({
            UserId,
            Direction,
            LogDate: formatLogDate(LogDate)
        }));

        console.log("mappedResult",mappedResult)
        
        const payloads = [];
        for (let i = 0; i < mappedResult.length; i++) {
            const { UserId, Direction, LogDate } = mappedResult[i];

            // Check if the current login time is the first in a sequence
            if (
                i === 0 || // First login time
                mappedResult[i - 1].UserId !== UserId || // Different user
                mappedResult[i - 1].Direction !== Direction || // Different direction
                (new Date(LogDate) - new Date(mappedResult[i - 1].LogDate)) / 1000 > 60 // Time difference > 60 seconds
            ) {
                const payload = {
                    docstatus: 0,
                    doctype: 'Employee Checkin',
                    name: '',
                    __islocal: 1,
                    __unsaved: 1,
                    owner: "",
                    log_type: Direction.toUpperCase(),
                    time: LogDate,
                    skip_auto_attendance: 0,
                    employee_name: "",
                    employee: UserId
                };
                // payloads.push(payload);
                console.log("payloads", payload);
                try {
                    // const formData = new FormData();
                    // formData.append('doc', JSON.stringify(payload));
                    // formData.append('action', "Save");
                    const formData = `doc=${encodeURIComponent(JSON.stringify(payload))}&action=Save`;
                    const response = await SaveCheckInOutInfo(formData);
                    console.log("API call successful:", response);
                } catch (error) {
                    console.error("API call failed:", error);
                }
            }
        }
        // console.log("All API calls completed");
        return ;
        
    } catch (err) {
        console.error(err);
    } finally {
        pool.close();
    }
}

async function SaveCheckInOutInfo(formData) {
    const token = '4df0684fc85286c:a5248fdb387c52f'
    return new Promise((resolve, reject) => {
        const requestOptions = {
            headers: {
                'Authorization': `token ${token}`,
                // 'Content-Type': 'multipart/form-data' // Update content type to 'multipart/form-data'
            }
        }
        console.log("data0000000000000000000",formData)
        axios.post("https://twilight.frappe.cloud/api/method/frappe.desk.form.save.savedocs", formData, requestOptions).then((data) => {
               resolve(data);
        }, err => {
             console.log('err', err)
            reject(err);
        })
    });
}


function formatLogDate(logDate) {
    const utcDate = new Date(logDate); 
    const istDate = new Date(
        utcDate.getUTCFullYear(),
        utcDate.getUTCMonth(),
        utcDate.getUTCDate(),
        utcDate.getUTCHours(),
        utcDate.getUTCMinutes(),
        utcDate.getUTCSeconds()
    );
    istDate.setMinutes(istDate.getMinutes() + istDate.getTimezoneOffset() + 330); // 330 minutes offset for IST
    
    // Format the date string manually
    const formattedDate = [
        istDate.getFullYear(),
        (istDate.getMonth() + 1).toString().padStart(2, '0'),
        istDate.getDate().toString().padStart(2, '0')
    ].join('-');

    // Format the time string manually
    const formattedTime = [
        istDate.getHours().toString().padStart(2, '0'),  
        istDate.getMinutes().toString().padStart(2, '0'), 
        istDate.getSeconds().toString().padStart(2, '0') 
    ].join(':');

    // Return formatted date and time string
    return `${formattedDate} ${formattedTime}`;
}

               
module.exports = { frappecheckInOut };