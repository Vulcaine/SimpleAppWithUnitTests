const cheerio = require('cheerio');
const request = require('request');

const RssParser = require('rss-parser');
const rssparser = new RssParser();

const xmlConvert = require('xml-js');


const atom = require('./atomTestInput');

const feeds = {
    "rss": [],
    "atom": [],
};

const getUrl = function (siteUrl, errCallback, returnCallback) {
    request(siteUrl, function (error, response, body) {
        if (error) {
            return errCallback(error);
        }

        return returnCallback(response, body);
    })
}

const cheerioLoadWebsite = function (siteUrl, errCallback, returnCallback) {
    getUrl(siteUrl, 
        errCallback, 
        (res, body) => returnCallback(cheerio.load(body)) );
}

const readRssFeeds = async function (href, errCallback, finishCallback) {
    if (href.includes('rss')) {
        let feed = await rssparser.parseURL(href);

        await feed.items.forEach(item => {
            feeds.rss.push(item.link);
        });
    }

    finishCallback();
}

const consumeAtomFeeds = function (body, errCallback, finishCallback) {
    const jsonBody = JSON.parse(xmlConvert.xml2json(body, {compact: true, spaces: 4}));

    const consumeLinks = function (linkArray) {
        for(let i = 0; i < linkArray.length; i++) {
            const link = linkArray[i];

            feeds.atom.push(link._attributes.href);
        }
    }

    if (jsonBody && jsonBody.feed && jsonBody.feed.link) {
        const feedLinks = jsonBody.feed.link;
        const entries = jsonBody.feed.entry;

        consumeLinks(feedLinks);

        if (Array.isArray(entries)) {
            for(let i = 0; i < entries.length; i++) {
                if (entries[i] && entries[i].link) {
                    const entryLinks = entries[i].link;
                    consumeLinks(entryLinks);
                }
            }
        } else {
            consumeLinks(jsonBody.feed.entry.link);
        }
    }

    finishCallback();
}

const readAtomFeeds = function (href, errCallback, finishCallback) {
    if (href.includes('atom')) {
        getUrl(href, errCallback, (res, body) => consumeAtomFeeds(body, errCallback, finishCallback))
    }
} 

const finishProcess = function () {
    console.log('process is finished');
    console.log(feeds);
}

const errorProcess = function (e) {
    console.log('Error in process:' + e);
}

cheerioLoadWebsite('https://brandpanda.com/domain/fakewebsite.com/', errorProcess, async $ => { 
    $('link').each(function(i, link) {;
        const type = $(this).attr('type');
        if (type) {
            const href = $(this).attr('href');
            readRssFeeds(href, errorProcess, _ => 
                readAtomFeeds(href, errorProcess, _ => _));
        }
    });

    finishProcess()
});

//TEST WITH INPUTS BELOW
//readRssFeeds('https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', errorProcess, _ => console.log(feeds))
//consumeAtomFeeds(atom, errorProcess, _ => console.log(feeds));



