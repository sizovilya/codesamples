
//***********************************************
// Из проекта на Meteor, просто несколько методов
//***********************************************

Meteor.methods({
    getMembers: function (postId) {
        var members = Posts.find({_id: postId}, {fields: {members: 1}}).fetch()[0].members;
        return members;
    },
    getCreator: function (id) {
        var creator = Meteor.users.findOne({_id: id}, {fields: {'profile': 1}});
        return creator;
    },
    membersCount: function (reqId) {
        var members = Rooms.find({reqId: reqId}, {fields: {'members': 1}}).fetch();
        if (members)
            return members.length;
        else
            return 0;
    },
    hasRoom: function (reqId) {
        var hasRoom = Rooms.find({reqId: reqId}, {}).fetch();
        if (hasRoom.length > 0)
            return true;
        return false;
    },
    getRoomId: function (reqId) {
        var room = Rooms.find({reqId: reqId}, {}).fetch();
        if (room)
            return room[0]._id;
    },
    comment: function (commentAttributes) {
        var user = Meteor.user();
        var post = Posts.findOne(commentAttributes.postId);

        if (!user)
            throw new Meteor.Error(401, "You need to login to make comments");
        if (!commentAttributes.body)
            throw new Meteor.Error(422, 'Please write some content');
        if (!post)
            throw new Meteor.Error(422, 'You must comment on a post');

        var comment = _.extend(_.pick(commentAttributes, 'postId', 'body'), {
            user: {
                id: user._id,
                name: user.profile.name,
                avatar: user.profile.avatar
            },
            date: new Date()
        });
        Posts.update(comment.postId, {$inc: {commentsCount: 1}});

        return Comments.insert(comment);
    }
});









//**************************************************************************
// Из проекта на node.js/express, часть oauth авторизации через vk
//**************************************************************************

// gets token from db
const getToken = (user_id, app, res, next) => {
    sql.connect(config.sqlConfig).then(function() {
        var request = new sql.Request();
        request.input('mode', sql.VarChar(50), 'getToken').input('vkId', sql.BigInt, user_id).input('app', sql.VarChar('MAX'), app).execute('dbo.auth').then((recordsets) => {
            const token = recordsets[0][0].token;
        const name = recordsets[0][0].name;
        const avatar = recordsets[0][0].avatar;
        res.json({token,name,avatar});
    }).catch((err) => {
            return next(err.message);
    });
    })
}

// query to VK and create user and token
const createUser = (res, user_id, access_token, app, email, next) => {
    const url = `https://api.vk.com/method/users.get?user_ids=${user_id}&fields=sex,bdate,city,country,photo_100,photo_200&access_token=${access_token}&v=5.60`;
    getContent(url).then((r) => {
        data = JSON.parse(r);
    if(data.error)
        return next(data.error.error_msg);

    data.email = email;
    sql.connect(config.sqlConfig).then(function() {
        var request = new sql.Request();
        request.input('mode', sql.VarChar(50), 'createUser').input('json', sql.NVarChar('MAX'), JSON.stringify(data)).input('app', sql.VarChar('MAX'), app).execute('dbo.auth').then((recordsets) => {
            const token = recordsets[0][0].token;
        const name = recordsets[0][0].name;
        const avatar = recordsets[0][0].avatar;
        res.json({token,name,avatar});
    }).catch((err) => {
            return next(err.message);
    });
    });

}).catch((err) => {
        return next(err.message)
    });
}

const Auth = (req, res, next) => {
    const access_token = req.body.access_token;
    const user_id = req.body.user_id;
    const email = req.body.email;
    const app = req.headers.app;
    let token;

    if (!access_token)
        return next('Please set access_token');

    if (!user_id)
        return next('Please set user_id');

    // Check if user exists
    sql.connect(config.sqlConfig).then(function() {
        var request = new sql.Request();
        request.input('mode', sql.VarChar(50), 'checkUser').input('vkId', sql.BigInt, user_id).execute('dbo.auth').then((recordsets) => {
            var userExists = recordsets[0][0].userExists;

        if (userExists === true)
            getToken(user_id, app, res, next);
        else
            createUser(res, user_id, access_token, app, email ,next);

    }
        ).catch((err) => {
            return next(err.message);
    });
    })

}

module.exports = Auth;







//************************************************************************
// Из проекта на React Native, метод для работы с API
//************************************************************************
import {Platform} from 'react-native'

export default class Api {
    constructor() {
        this.server = 'http://192.168.1.2:3000';
        this.url = this.server + '/api';
        this.platform = Platform.OS;
    }

    async Auth(data) {
        let link = this.url + '/auth/vk'
        let headers = new Headers({"Content-Type": "application/json", "app": this.platform});
        try {
            let response = await fetch(link,{
                method:'POST',
                headers:headers,
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e) {
            throw e.message;
        }
    }

    getImageUrl(img){
        return this.server + '/images/' + img;
    }
}
