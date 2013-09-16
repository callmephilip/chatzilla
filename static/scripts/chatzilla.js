(function($,window){
	
	var chatAPI = {

		connect : function(done) {
			this.socket = io.connect('/chat');
			this.socket.on('connect', done);
		},

		join : function(email, onJoin){
			this.socket.emit('join', email, onJoin);
		},

		sendMessage : function(message, onSent) {
			this.socket.emit('message', message, onSent);
		}

	};	

	var bindUI = function(){
		$(".join-chat").validate({
			submitHandler: function(form) {
				chatAPI.join($(form).find("[name='email']").val(), function(joined, name){
					if(joined){
						alert("You've joined Chatzilla");
						$(form).hide();
						$(".compose-message-form").show();
					}
				});
			}
		});

		$(".compose-message-form").validate({
			submitHandler: function(form) {
				chatAPI.sendMessage($(form).find("[name='message']").val(), function(sent,message){
					if(sent){
						alert("Your message was sent");
					}
				});
			}
		});
	};

	var ready = function(){
		bindUI();
		console.log("Welcome to Chatzilla");
		chatAPI.connect(function(){});
	};



	$(function(){ ready(); });

}($,window));



// socket.on('message', function(message){
// 			alert("got a message: " + message);
// 		});