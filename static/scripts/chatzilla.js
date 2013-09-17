(function($,jQuery,window){
	
	var templates = {
		chatMessage : null,
		statsBar : null
	};


	var globals = {
		myPicture : null,
		myEmail : null
	};

	var tools = {
		getGravatarUrl : function(email){
        	return "http://www.gravatar.com/avatar/" + md5(email.trim().toLowerCase());
    	},

    	getRandomArbitary : function(min, max) {
		    return Math.floor(Math.random() * (max - min + 1)) + min;
		},

		getRandomListElement : function(list){
			return list[this.getRandomArbitary(0,list.length-1)];
		}
	};

	var chatAPI = {

		connect : function(done) {

			var that = this;

			this.socket = io.connect('/chat');
			this.socket.on('connect', done);

			this.socket.on('message', function(message){
				if(that.onMessage){
					that.onMessage(message);
				}
			});

			this.socket.on('stats', function(stats){
				if(that.onStats){
					that.onStats(stats);
				}
			});
		},

		join : function(email, onJoin){
			this.socket.emit('join', email, onJoin);
		},

		sendMessage : function(message, onSent) {
			this.socket.emit('message', message, onSent);
		},

		disconnect : function(){
			this.socket.disconnect();
		}

	};	

	var bindUI = function(){

		var displayChatMessage = function(message){
			$(".messages").append(
				templates.chatMessage({
					author : message.sender === globals.myEmail ? "Me" : message.sender,
					time : moment(message.sent).format("H:mm"),
					message : message.content,
					avatarUrl : tools.getGravatarUrl(message.sender),
					labelClass : tools.getRandomListElement(["label-default","label-primary","label-success","label-info","label-warning","label-danger"])
				})
			);
		};

		$(window).unload(function() {
			chatAPI.disconnect();
		});

		$(".join-chat").validate({
			submitHandler: function(form) {

				var email = $(form).find("[name='email']").val();

				$(".join-chat").find(".btn").attr("disabled","disabled");

				globals.myPicture = tools.getGravatarUrl(email);

				chatAPI.join(email, function(joined, name){
					if(joined){
						globals.myEmail = email;
						$(form).hide();
						$(".chat-panel").addClass("animated slideInRight");
						$(".messages-wrapper").addClass("animated slideInLeft");
						$(".splash").addClass("animated fadeOutUp");
						$(".stats-bar").addClass("animated fadeInDown");
					}
				});
			},

			invalidHandler: function(event, validator){
				$("[name='email']").parent().addClass("has-error");
			}
		});

		$(".compose-message-form").find("[name='message']").on("keyup",function(e){
			e = e || event;
			if (e.keyCode === 13 && !e.ctrlKey) {
				$(".compose-message-form").submit();
			}
			return true;
		});

		$(".compose-message-form").validate({
			submitHandler: function(form) {
				$(".compose-message-form").find("[name='message']").attr("disabled","disabled");

				chatAPI.sendMessage($(form).find("[name='message']").val(), function(sent,message){
					if(sent){
						$(".compose-message-form").find("[name='message']").removeAttr("disabled");
						$(".compose-message-form").find("textarea").val("");
						displayChatMessage(message);
					}
				});
			},

			invalidHandler: function(event, validator){
				$("[name='message']").parent().addClass("has-error");
			}
		});

		chatAPI.onMessage = function(message){
			displayChatMessage(message);
		};

		chatAPI.onStats = function(stats){
			stats.peopleCount = stats.people.length;
			for(var i=0; i<stats.people.length; i++){
				stats.people[i] = {
					email : stats.people[i],
					image : tools.getGravatarUrl(stats.people[i])
				};
			}

			$(".stats-bar").html(
				templates.statsBar(stats)
			);
		};

	};

	var ready = function(){

		templates.chatMessage = Handlebars.compile($("#temlate-chat-message").html());
		templates.statsBar = Handlebars.compile($("#template-stats-bar").html());

		bindUI();
		console.log("Welcome to Chatzilla");
		chatAPI.connect(function(){});
	};



	$(function(){ ready(); });

}($,jQuery,window));