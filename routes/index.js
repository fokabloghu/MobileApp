
/*
 * GET home page.
 */
var check = require('validator').check
, sanitize = require('validator').sanitize
, db = require('../models/dbSchema.js')
, fs = require('fs')
, path = require('path')
, im = require('imagemagick')
, easyimg = require('easyimage')
, gm = require('gm');

exports.homepage = function(req, res){

  res.render('home');

};
exports.myphotos = function(req, res){

	//Gets an Array of Photo ObjectIds for the user
	var photoIDs = req.user.photos.toObject();
	var photoLinks = new Array();
	var photoScores = new Array();
	var waiting = 0;

	//Loop through photoIDs for the user and adds them to the above array
	if(photoIDs.length==0){
		complete();

	}else{
		for (var i = photoIDs.length - 1; i >= 0; i--) {
		
		waiting++;
		db.photoModel.findById(photoIDs[i],function(err,doc){
			if(err){
				console.log('ERROR FINDING PHOTO WITH ID' + err);
			}else{
				waiting--;
				if(doc){
					//console.log(path.basename(doc.photoLink));
					photoLinks.push(path.basename(doc.photoLink));
					photoScores.push(doc.currentRating);
				}
				complete();

			}
		});
	
		};

	}


	//Callback function when iterating is done
	function complete(){
		if(waiting==0)
		{
			if(photoLinks.length < 1){
				photoLinks = ['noUpload.jpg'];
			}
			res.render('myphotos',{
			_USERNAME : req.user.username,
			_PHOTOS: photoLinks
			});
		}
		};

	};


exports.new = function(req,res){
res.render('new');


};
exports.profile = function(req,res){


db.photoModel.findOne({},function(err,doc){
	if(err){
		console.log('Error Finding Photo!');

	}else{
		if(doc){
			var photoName = path.basename(doc.photoLink);
			var photoRating = doc.currentRating;
			complete(photoName, photoRating);

		}else{
			complete('noUpload.jpg');
		}
	}

});
function complete(photoName, photoRating){

	res.render('profile', { 
		_USERNAME : req.user.username, 
		_PHOTO: photoName,
		_PHOTORATING: photoRating});

}




};

exports.logout = function(req,res){
	req.logout();
  	res.redirect('/');
};

exports.login = function(req,res){
	res.redirect('/');
};

exports.account = function(req,res){

	res.render('account',
		{
			_USERNAME : req.user.username,
			_EMAIL : req.user.email,
			_DATEJOINED : req.user.dateCreated
		});

};
exports.deletePhoto = function(req,res){
	//Get Photo name from query string
	var photoName = req.query.name;
	var photoToDelete = db.photoModel.findOne({'photoName': photoName},function(err,doc){
		if(err){
			console.log(err);
			res.redirect('/myphotos');
		}else{
			//if a photo to be deleted is return we go ahead and delete else we just go back to myPhotos
			if(doc){
				var photoToDeleteID = doc.id;
				//Remove Photo from photoCollections
				doc.remove(complete(photoName,photoToDeleteID));
				
			}else{
				res.redirect('/myphotos');
			}
		};
	});
	

	var complete = function(photoName,photoToDeleteID){
		//Check if that Object exists first
		if(photoToDeleteID){
			
			
			//Remove PhotoObject from user photos
			var index = req.user.photos.indexOf(photoToDeleteID);
			req.user.photos.splice(index,1);
			req.user.save();

			//Remove Photo from directory
			var photoPath = path.resolve(__dirname,'../public/photos/',photoName);
			fs.unlink(photoPath, function(err){
				if(err){
					console.log('Error FileDelte : '+err);
				}
			});

		}
		res.redirect('/myphotos');
	};
	


};
exports.uploadPhoto = function(req,res){
	if(req.files){
		console.log(req.files);
		fs.readFile(req.files.photo.path, function (err, data) {

		  	//Create new Photo object and save to mongoDB!!
		  	//Get the photo name and add it to /photos/ since we know thats
		  	//where all photos are stored.
		 
		  	var newPhotoName = path.basename(req.files.photo.path);
		  	var photoPath = '/photos/'+newPhotoName;
		  	var photo = new db.photoModel({photoLink:photoPath, photoName:newPhotoName});
		  	photo.save();
		  	var photoID = photo.id;
		  	req.user.photos.push(photoID);
		  	req.user.save();
		  	res.redirect('/profile');
			
		    
		  
		});
	}else{
		res.redirect('/profile');
	}
	
};

exports.signup = function(req,res){
	var tempusername = sanitize(req.body.username).trim();
	var temppass1 = req.body.password1;
	var temppass2 = req.body.password2;
	var tempemail = sanitize(req.body.email).trim();
	var isValidEmail = true;
	try{
		check(tempemail).isEmail();
	}catch(e){
		isValidEmail = false;
		console.log(e.message);
	}
	if((temppass2 != temppass1) || tempusername == '' || !isValidEmail){
		res.redirect('/new');
	}else{
		var user = new db.userModel({ username: tempusername, email: tempemail, password: temppass1 });
		user.save(function(err) {
	  			if(err) {
	  			console.log("ERROR SAVING!");
	    		console.log(err);
	    		res.redirect('/new');
	  		} else {
	  			//Console Log that we added the user
	    		console.log('user: ' + user.username + " saved.");
	    		//Login the User straight away
				req.login(user, function(err) {
	        		if (err) {
	          		console.log(err);
	        		}
	        		return res.redirect('/profile');
	      		});
	  		}
		});
	}
}