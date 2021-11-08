import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogErrorComponent } from '../../components/dialog-error/dialog-error.component';
import { LayoutClass } from '../../types/layout-type';

import linkifyStr from 'linkifyjs/string';
import { NgxLinkifyOptions } from '../../types/linkify-type';

@Injectable({
	providedIn: 'root'
})
export class UtilsService {
	private dialogRef: MatDialogRef<DialogErrorComponent, any>;

	constructor(public dialog: MatDialog) { }

	toggleFullscreen(elementId: string) {
		const document: any = window.document;
		const fs = document.getElementById(elementId);
		if (
			!document.fullscreenElement &&
			!document.mozFullScreenElement &&
			!document.webkitFullscreenElement &&
			!document.msFullscreenElement
		) {
			if (fs.requestFullscreen) {
				fs.requestFullscreen();
			} else if (fs.msRequestFullscreen) {
				fs.msRequestFullscreen();
			} else if (fs.mozRequestFullScreen) {
				fs.mozRequestFullScreen();
			} else if (fs.webkitRequestFullscreen) {
				fs.webkitRequestFullscreen();
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			}
		}
	}

	handlerScreenShareError(error: any) {
		if (error && error.name === 'SCREEN_SHARING_NOT_SUPPORTED') {
			alert('Your browser does not support screen sharing');
		} else if (error && error.name === 'SCREEN_EXTENSION_DISABLED') {
			alert('You need to enable screen sharing extension');
		} else if (error && error.name === 'SCREEN_CAPTURE_DENIED') {
			// alert('You need to choose a window or application to share');
		}
	}


	generateNickname(): string {
		return 'IndianHealth-User' + Math.floor(Math.random() * 100);
	}

	isFirefox(): boolean {
		return /Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent);
	}

	isMobile(): boolean {
		return this.isAndroid() || this.isIos();
	}

	showErrorMessage(header: string, message: string, disableClose: boolean = false) {
		if (message && message != '') {
			message = message.replace(/OpenVidu/, 'Indian Health VC');
		}
		if(header ==='Connection Problem'){
			this.dialogRef = this.dialog.open(DialogErrorComponent, {
				data: { header: header, message: message },
				disableClose
			});
		}else{
			this.dialogRef = this.dialog.open(DialogErrorComponent, {
				data: { header: header, message: 'Something went wrong please contact System Admin.' },
				disableClose
			});
		}
		
	}

	closeDialog() {
		this.dialogRef?.close();
	}

	getHTMLElementByClassName(element: HTMLElement, className: string): HTMLElement {
		while (!!element && element !== document.body) {
			if (element.className.includes(className)) {
				return element;
			}
			element = element.parentElement;
		}
		return null;
	}

	toggleBigElementClass(element: HTMLElement | Element) {
		if (element?.className.includes(LayoutClass.BIG_ELEMENT)) {
			this.removeBigElementClass(element);
		} else {
			element.classList.add(LayoutClass.BIG_ELEMENT);
		}
	}

	removeBigElementClass(element: HTMLElement | Element) {
		element?.classList.remove(LayoutClass.BIG_ELEMENT);
	}

	removeAllBigElementClass() {
		const elements: HTMLCollectionOf<Element> = document.getElementsByClassName(LayoutClass.BIG_ELEMENT);
		while (elements.length > 0) {
			this.removeBigElementClass(elements[0]);
		}
	}

	isSmallElement(element: HTMLElement | Element): boolean {
		return element?.className.includes(LayoutClass.SMALL_ELEMENT);
	}

	getNicknameFromConnectionData(data: string): string {
		let nickname: string;
		try {
			nickname = JSON.parse(data).clientData;
		} catch (error) {
			nickname = 'Unknown';
		}
		return nickname;
	}
	getParticipantsMenuFromConnectionData(data: string): boolean {
		let menu = false;
		try {
			menu = JSON.parse(data).participantsMenu;
		} catch (error) {

		}
		return menu;
	}

	linkify(text: string, options?: NgxLinkifyOptions): string {
		return linkifyStr(text, options);
	}
	getMacOrIOSOS(): any {
		var userAgent = window.navigator.userAgent,
			platform = window.navigator.platform,
			macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
			windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
			iosPlatforms = ['iPhone', 'iPad', 'iPod'],
			os = 'CHECKOS';

		if (macosPlatforms.indexOf(platform) !== -1) {
			os = 'Mac OS';
		} else if (iosPlatforms.indexOf(platform) !== -1) {
			os = 'iOS';
		} else if (windowsPlatforms.indexOf(platform) !== -1) {
			os = 'Windows';
		} else if (/Android/.test(userAgent)) {
			os = 'Android';
		} else if (!os && /Linux/.test(platform)) {
			os = 'Linux';
		}
		return os;
	}


	private isAndroid(): boolean {
		return /\b(\w*Android\w*)\b/.test(navigator.userAgent) && /\b(\w*Mobile\w*)\b/.test(navigator.userAgent);
	}

	private isIos(): boolean {
		return this.isIPhoneOrIPad(navigator?.userAgent) && this.isIOSWithSafari(navigator?.userAgent);
	}

	private isIPhoneOrIPad(userAgent): boolean {
		const isIPad = /\b(\w*Macintosh\w*)\b/.test(userAgent);
		const isIPhone = /\b(\w*iPhone\w*)\b/.test(userAgent) && /\b(\w*Mobile\w*)\b/.test(userAgent);
		// && /\b(\w*iPhone\w*)\b/.test(navigator.platform);
		const isTouchable = 'ontouchend' in document;

		return (isIPad || isIPhone) && isTouchable;
	}

	private isIOSWithSafari(userAgent): boolean {
		return /\b(\w*Apple\w*)\b/.test(navigator.vendor) && /\b(\w*Safari\w*)\b/.test(userAgent)
			&& !/\b(\w*CriOS\w*)\b/.test(userAgent) && !/\b(\w*FxiOS\w*)\b/.test(userAgent);
	}
}
