import { Component } from '@angular/core';
import { NavController,ToastController,ModalController } from 'ionic-angular';

import {User} from '../../providers/user/user';
import {AppProvider} from '../../providers/app-provider/app-provider';
import {HttpClient} from "../../providers/http-client/http-client";
import {SqlLite} from "../../providers/sql-lite/sql-lite";
import {OrganisationUnits} from "../organisation-units/organisation-units";
import {ProgramSelection} from "../program-selection/program-selection";
import {Program} from "../../providers/program";
import {OrganisationUnit} from "../../providers/organisation-unit";
import {Events} from "../../providers/events";
import {EventCaptureForm} from "../event-capture-form/event-capture-form";
import {ProgramStageDataElements} from "../../providers/program-stage-data-elements";
import {EventView} from "../event-view/event-view";
import {EventFieldSelectionMenu} from "../event-field-selection-menu/event-field-selection-menu";

/*
  Generated class for the EventCaptureHome page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-event-capture-home',
  templateUrl: 'event-capture-home.html',
  providers : [User,AppProvider,HttpClient,SqlLite,Program,OrganisationUnit,Events,ProgramStageDataElements]
})
export class EventCaptureHome {

  public loadingData : boolean = false;
  public loadingMessages : any = [];
  public currentUser : any;
  public organisationUnits : any;
  public selectedOrganisationUnit :any = {};
  public selectedOrganisationUnitLabel :string;
  public assignedPrograms : any;
  public selectedProgram : any = {};
  public selectedProgramLabel : string;
  public programIdsByUserRoles : any;
  public selectedDataDimension : any;
  public eventListSections : any;
  public isAllParameterSet : boolean;
  public currentSelectionStatus :any;

  public dataElementMapper :any = {};
  public dataElementToDisplay : any = {};
  public programStageDataElements : any;
  public tableFormat : any;
  public currentEvents : any;
  public hasEvents : boolean = false;

  //pagination controller
  public currentPage : number ;
  public paginationLabel : string = "";

  constructor(public eventProvider :Events,public OrganisationUnit : OrganisationUnit,
              public ProgramStageDataElements : ProgramStageDataElements,
              public Program : Program,public modalCtrl: ModalController,public navCtrl: NavController,public toastCtrl: ToastController,public user : User,public appProvider : AppProvider,public sqlLite : SqlLite,public httpClient: HttpClient) {
    this.selectedDataDimension = [];
    this.isAllParameterSet = false;
    this.currentSelectionStatus = {
      orgUnit : true,
      isOrgUnitSelected : false,
      program : false,
      isProgramSelected : false,
      message : ""
    };
    this.user.getCurrentUser().then(currentUser=>{
      this.currentUser = currentUser;
      this.getUserAssignedPrograms();
      this.loadOrganisationUnits();
      this.setProgramSelectionLabel();
    })
  }

  getUserAssignedPrograms(){
    this.programIdsByUserRoles = [];
    this.user.getUserData().then((userData : any)=>{
      userData.userRoles.forEach((userRole:any)=>{
        if (userRole.programs) {
          userRole.programs.forEach((program:any)=>{
            this.programIdsByUserRoles.push(program.id);
          });
        }
      });
    })
  }

  ionViewDidEnter() {
    if(this.isAllParameterSet){
      this.reLoadingEventList();
    }
  }

  setProgramSelectionLabel(){
    this.setOrganisationSelectLabel();
    this.setSelectedProgramLabel();
  }

  setOrganisationSelectLabel(){
    if(this.selectedOrganisationUnit.id){
      this.selectedOrganisationUnitLabel = this.selectedOrganisationUnit.name;
      this.currentSelectionStatus.program = true;
      this.currentSelectionStatus.isOrgUnitSelected = true;
    }else{
      this.selectedOrganisationUnitLabel = "Touch to select Organisation Unit";
      this.currentSelectionStatus.isOrgUnitSelected = false;
      this.currentSelectionStatus.program = false;
      if (this.currentSelectionStatus.orgUnit && !this.currentSelectionStatus.program) {
        this.currentSelectionStatus.message = "Please select organisation unit";
      }
    }
  }

  setSelectedProgramLabel(){
    if(this.selectedProgram.id){
      this.selectedProgramLabel = this.selectedProgram.name;
      this.currentSelectionStatus.program = true;
      this.currentSelectionStatus.isProgramSelected = true;
      this.currentSelectionStatus.message = "";
    }else{
      this.selectedProgramLabel = "Touch to select a Program";
      this.currentSelectionStatus.isProgramSelected = false;
      if (this.currentSelectionStatus.program && !this.isAllParameterSet) {
        this.currentSelectionStatus.message = "Please select program";
      }
    }
  }

  loadOrganisationUnits():void{
    this.loadingData = true;
    this.loadingMessages=[];
    this.setLoadingMessages('Loading organisation units');
    this.OrganisationUnit.getOrganisationUnits(this.currentUser).then((organisationUnits : any)=>{
      this.organisationUnits = organisationUnits;

      if(organisationUnits.length > 0){
        this.selectedOrganisationUnit = organisationUnits[0];
        this.selectedProgram = {};
        this.loadingPrograms();
        this.setProgramSelectionLabel();
      }else{
        this.loadingData = false;
      }
    },error=>{
      this.loadingData = false;
      this.setToasterMessage('Fail to load organisation units : ' + JSON.stringify(error));
    });
  }

  openOrganisationUnitModal(){
    this.loadingMessages = [];
    this.loadingData = true;
    let modal = this.modalCtrl.create(OrganisationUnits,{data : this.organisationUnits,selectedOrganisationUnit:this.selectedOrganisationUnit});
    modal.onDidDismiss((selectedOrganisationUnit:any) => {
      if(selectedOrganisationUnit.id){
        if(selectedOrganisationUnit.id != this.selectedOrganisationUnit.id){
          this.selectedOrganisationUnit = selectedOrganisationUnit;
          this.selectedProgram = {};
          this.loadingPrograms();
          this.setProgramSelectionLabel();
          this.isAllParameterSet = false;
        }else{
          this.loadingData = false;
        }
      }else{
        this.loadingData = false;
      }
    });
    modal.present();
  }

  loadingPrograms(){
    this.setLoadingMessages('Loading assigned programs');
    this.assignedPrograms = [];
    this.Program.getProgramsAssignedOnOrgUnitAndUserRoles(this.selectedOrganisationUnit,this.programIdsByUserRoles,this.currentUser).then((programs : any)=>{
      programs.forEach((program:any)=>{
        //checking for program type
        if(program.programType ==  "WITHOUT_REGISTRATION"){
          this.assignedPrograms.push({
            id: program.id,
            name: program.name,
            programStages : program.programStages,
            categoryCombo : program.categoryCombo
          });
        }
      });
      this.loadingData = false;
    },error=>{
      this.loadingData = false;
      this.setToasterMessage("Fail to load assigned programs : " + JSON.stringify(error));
    });
  }

  openProgramsModal(){
    if(this.currentSelectionStatus.program){
      this.loadingMessages = [];
      this.loadingData = true;
      this.setLoadingMessages('Please wait ...');
      let modal = this.modalCtrl.create(ProgramSelection,{data : this.assignedPrograms,selectedProgram : this.selectedProgram});
      modal.onDidDismiss((selectedProgram:any) => {
        if(selectedProgram.id){
          if(selectedProgram.id != this.selectedProgram.id){
            this.selectedDataDimension = [];
            this.selectedProgram = selectedProgram;
            this.loadingData = false;
            this.setProgramSelectionLabel();
            this.isAllParameterSet = false;
            if(selectedProgram.categoryCombo.categories[0].name =='default'){
              this.loadEvents();
            }
            this.loadingProgramStageDataElements(selectedProgram);
          }else{
            this.loadingData = false;
          }
        }else{
          this.loadingData = false;
        }
      });
      modal.present();
    }else{
      this.setToasterMessage("Please select organisation unit first");
    }
  }

  loadingProgramStageDataElements(program){
    this.dataElementToDisplay = {};
    this.ProgramStageDataElements.getProgramStageDataElements(program.programStages[0].programStageDataElements,this.currentUser).then((programStageDataElements:any)=>{
      this.programStageDataElements = programStageDataElements;
      programStageDataElements.forEach((programStageDataElement : any,index : any)=>{
        if(index < 2){
          this.dataElementToDisplay[programStageDataElement.dataElement.id] = programStageDataElement.dataElement;
        }
        this.dataElementMapper[programStageDataElement.dataElement.id] = programStageDataElement.dataElement;
      });
    })
  }

  /**
   * checking if category combination for program as  been selected or not
   */
  checkingForDataDimension(){
    if(this.selectedDataDimension.length == this.selectedProgram.categoryCombo.categories.length){
      let hasAllDataDimension = true;
      this.selectedDataDimension.forEach((dataDimension : any)=>{
        if(dataDimension.trim() == ""){
          hasAllDataDimension = false;
        }
      });
      if(hasAllDataDimension){
        this.loadEvents();
      }
    }
  }

  /**
   * load events
   */
  loadEvents(){
    this.loadingData = true;
    this.loadingMessages = [];
    this.setLoadingMessages("Downloading most recent events");
    this.eventProvider.loadEventsFromServer(this.selectedOrganisationUnit,this.selectedProgram,this.selectedDataDimension,this.currentUser).then((events : any)=>{
      this.setLoadingMessages("Saving most recent events");
      this.eventProvider.savingEventsFromServer(events,this.currentUser).then(()=>{
        this.loadEventsFromOfflineStorage();
      },error=>{
        this.loadingData = false;
        this.setToasterMessage("Fail to save most recent events : " + JSON.stringify(error));
      });
    },error=>{
      this.setToasterMessage("Fail to download most recent events : " + JSON.stringify(error));
      this.loadEventsFromOfflineStorage();
    });
  }

  /**
   * loading all events based on selected option from offline storage
   */
  loadEventsFromOfflineStorage(){
    this.setLoadingMessages("Loading events from offline storage");
    this.eventProvider.loadingEventsFromStorage(this.selectedOrganisationUnit,this.selectedProgram,this.currentUser).then((events:any)=>{
      let currentEvents = [];
      if(this.selectedDataDimension.length > 0){
        let attributeCategoryOptions = this.selectedDataDimension.toString();
        attributeCategoryOptions = attributeCategoryOptions.replace(/,/g, ';');
        events.forEach((event : any)=>{
          if(event.attributeCategoryOptions == attributeCategoryOptions){
           currentEvents.push(event);
          }
        });
      }else{
        currentEvents = events;
      }
      if(currentEvents.length > 0){
        this.hasEvents = true;
      }else{
        this.hasEvents = false;
      }
      this.currentEvents = currentEvents;
      //this.loadEventListAsTable();
      this.loadEventListAsListOfCards();
    },error=>{
      this.loadingData = false;
      this.setToasterMessage("Fail to load events from offline storage : " + JSON.stringify(error));
    });
  }

  //@todo includes status and incident date on selection
  showFieldSelectionMenu(){
    let modal = this.modalCtrl.create(EventFieldSelectionMenu,{dataElementToDisplay: this.dataElementToDisplay,dataElementMapper:this.dataElementMapper});
    modal.onDidDismiss((dataElementToDisplayResponse:any)=>{
      this.dataElementToDisplay = {};
      this.dataElementToDisplay = dataElementToDisplayResponse;
      //this.loadEventListAsTable();
      //this.loadEventListAsListOfCards();
    });
    modal.present();
  }

  loadEventListAsTable(){
    this.eventProvider.getEventListInTableFormat(this.currentEvents,this.dataElementToDisplay).then((table:any)=>{
      this.tableFormat = table;
      this.eventListSections = [];
      this.isAllParameterSet = true;
      this.loadingData = false;
    });
  }

  loadEventListAsListOfCards(){
    let currentEvents = this.currentEvents;
    this.eventProvider.getEventSections(currentEvents).then((eventSections:any)=>{
      this.eventListSections = eventSections;
      this.tableFormat =  null;
      this.changePagination(0);
      this.isAllParameterSet = true;
      this.loadingData = false;
    });
  }

  /**
   * reload event
   */
  reLoadingEventList(){
    this.loadingMessages = [];
    this.loadingData = true;
    this.loadEventsFromOfflineStorage();
  }

  /**
   * navigate to event
   * @param event
     */
  goToEventView(event){
    let params = {
      orgUnitId : this.selectedOrganisationUnit.id,
      orgUnitName : this.selectedOrganisationUnit.name,
      programId : this.selectedProgram.id,
      programName : this.selectedProgram.name,
      event : event.event
    };
    this.navCtrl.push(EventView,{params:params});
  }

  /**
   * edit event
   * @param event
     */
  gotToEditEvent(event){
    let params = {
      orgUnitId : this.selectedOrganisationUnit.id,
      orgUnitName : this.selectedOrganisationUnit.name,
      programId : this.selectedProgram.id,
      programName : this.selectedProgram.name,
      selectedDataDimension : this.selectedDataDimension,
      event : event.event
    };
    this.navCtrl.push(EventCaptureForm,{params:params});
  }

  changePagination(page){
    page = parseInt(page);
    if(page == -1){
      this.currentPage = 0;
    }else if(page == this.eventListSections.length){
      this.currentPage = this.eventListSections.length - 1;
    }else{
      this.currentPage = page;
    }
    this.paginationLabel = (this.currentPage + 1) + "/"+this.eventListSections.length;
  }

  goToEventRegister(){
    let params = {
      orgUnitId : this.selectedOrganisationUnit.id,
      orgUnitName : this.selectedOrganisationUnit.name,
      programId : this.selectedProgram.id,
      programName : this.selectedProgram.name,
      selectedDataDimension : this.selectedDataDimension,
      event : ""
    };
    this.navCtrl.push(EventCaptureForm,{params:params});
  }

  setLoadingMessages(message){
    this.loadingMessages.push(message);
  }

  setToasterMessage(message){
    let toast = this.toastCtrl.create({
      message: message,
      duration: 3000
    });
    toast.present();
  }

  setStickToasterMessage(message){
    let toast = this.toastCtrl.create({
      message: message,
      showCloseButton : true
    });
    toast.present();
  }

}
