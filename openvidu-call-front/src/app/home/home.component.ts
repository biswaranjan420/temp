import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { NavigationExtras, Router } from '@angular/router';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
	public roomForm: FormControl;
	public version = require('../../../package.json').version;
	
	reJoinRoom = false;
	reJoinRoomKey = 'MeetMonkConfRoomName';
	reJoinRoomName: string;
	isSubmitted=false;;
	@HostListener('document:keydown.control.shift.i', ['$event'])
	keydownHandler(event: Event) {
		event.preventDefault();
		alert('This function is not allowed here.');
	}
	

	constructor(private router: Router, public formBuilder: FormBuilder) { }

	ngOnInit() {
		this.isSubmitted = false;
		//const randomName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals], separator: '-', });
		this.roomForm = new FormControl('', [Validators.minLength(4), Validators.required]);
		// Rejoin button code
		this.reJoinRoom = false;
		if (!(sessionStorage.getItem(this.reJoinRoomKey) === null)) {
			this.reJoinRoom = true;
			this.reJoinRoomName = sessionStorage.getItem(this.reJoinRoomKey);
		}
		// Rejoin button code
	}
	@HostListener('window:contextmenu',['$event'])
	contextmenu(event: Event) {
		event.preventDefault();
		alert('This function is not allowed here.');
	}

	public goToVideoCall() {
		this.isSubmitted = true;
		if (this.roomForm.valid) {
			const roomName = this.roomForm.value.replace(/ /g, '-'); // replace white spaces by -
			this.roomForm.setValue(roomName);
			sessionStorage.setItem(this.reJoinRoomKey, roomName);
			if (!(sessionStorage.getItem('meetmonk_confrnc_cordntr') === null)) {
				if(sessionStorage.getItem('meetmonk_confrnc_cordntr') === 'true'){
					  this.router.navigate(['/', roomName],{ queryParams: { participantRole: 'conferencecoordinator' }});
				}
				if(sessionStorage.getItem('meetmonk_confrnc_cordntr') === 'false'){
					this.router.navigate(['/', roomName]);
				}
			}else{
				this.router.navigate(['/', roomName]);
			}
			
		}
	}

	reJoinExistingSessionRoom(): void {
		this.roomForm.setValue(this.reJoinRoomName);
		this.goToVideoCall();
	}
	toogleReJoinRoomFlag(){
		this.reJoinRoom = false;
	}
}
