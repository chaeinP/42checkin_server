import loki from 'lokijs';

(async function main() {
    let apiKeyList = [
        {
            "owner": "ohjongin",
            "client_id": "e901bbb9b758f58ea7e14acb40a21fae824bdc5e99a79405c13673b2ddb2ac1a",
            "client_secret": "4424b5db7245d9e37de56879033f2dd93f6ab61cf9eb0c731fc0fbb4ac662333",
            "grant_type": "client_credentials"
        },
        {
            "owner": "ohjongin",
            "client_id": "2067f6233450bde2cd71303b0c827393bc96d6d153f9aaa676a7029a16b3578e",
            "client_secret": "1c833d46859d0e3686a92cfd66d1d44ff3843783201590ec8b3c676d84073959",
            "grant_type": "client_credentials"
        }
    ];

    const db = new loki(".42auth.db.json");
    const loaded = await new Promise((resolve, reject) => {
        db.loadDatabase({}, function () {
            let credentials = db.getCollection('credentials')
            return resolve(credentials?.data);
        });
    })
    console.log('[loaded]', loaded);

    let credentials = db.addCollection("credentials", { indices: ["index"] });

    for (let i = 0; i < apiKeyList.length; i++) {
        const key = apiKeyList[i];
        let ret = credentials.chain().find({client_id: key.client_id}).data();
        if (Array.isArray(ret) && ret.length > 0) continue;
        credentials.insert({
            index: i,
            client_id: key.client_id,
            client_secret: key.client_secret,
            grant_type: key.grant_type
        });
    }

    db.saveDatabase();

    let data = credentials.chain().find().data();
    console.log('[all]', data);

    data = credentials.chain().find({'index':{'$eq': 0}}).data();
    console.log('[0]', data);

    data = credentials.findOne({'index': 1});
    console.log('[findOne]', data);

    data = credentials.find({ index : { $eq: 1 } });
    console.log('[find]', data);
})();
