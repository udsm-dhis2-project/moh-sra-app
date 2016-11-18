import { Component } from '@angular/core';
import { NavController,NavParams,ToastController } from 'ionic-angular';
import {HttpClient} from "../../providers/http-client/http-client";
import {User} from "../../providers/user/user";
import {SqlLite} from "../../providers/sql-lite/sql-lite";
import {DataValues} from "../../providers/data-values";
import {EntryForm} from "../../providers/entry-form";

/*
  Generated class for the DataEntryForm page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-data-entry-form',
  templateUrl: 'data-entry-form.html',
  providers : [User,HttpClient,SqlLite,DataValues,EntryForm],
})
export class DataEntryForm {

  public loadingData : boolean = false;
  public loadingMessages : any = [];
  public currentUser : any;
  public dataEntryFormSelectionParameter : any;
  public selectedDataSet : any;
  public entryFormSections : any;
  public dataSetAttributeOptionCombo : any;
  //entry form data values and storage status
  public entryFormDataValues : any;
  public storageStatus : any = { online :0,local : 0};

  //labels
  public selectedDataSetLabel : string = "";
  public selectedOrganisationUnitLabel : string = "";
  public selectedPeriodLabel : string = "";
  public paginationLabel : string = "";

  //pagination controller
  public currentPage : number ;

  //dataSet completeness
  public isDataSetCompleted : boolean = false;

  constructor(private params:NavParams, private toastCtrl:ToastController,
              private user:User, private httpClient:HttpClient,
              private entryForm:EntryForm, private sqlLite:SqlLite,
              private dataValues:DataValues) {

    this.user.getCurrentUser().then((user:any)=> {
      this.currentUser = user;
      this.currentPage = 0;
      this.dataEntryFormSelectionParameter = this.params.get('data');
      this.loadDataSet(this.dataEntryFormSelectionParameter.formId);
    });
  }

  loadDataSet(dataSetId){
    this.loadingData = true;
    this.loadingMessages=[];
    this.setLoadingMessages('Loading entry form details');
    let resource  = "dataSets";
    let attribute = "id";
    let attributeValue = [];
    attributeValue.push(dataSetId);
    this.sqlLite.getDataFromTableByAttributes(resource,attribute,attributeValue,this.currentUser.currentDatabase).then((dataSets : any)=>{
      this.selectedDataSet = dataSets[0];
      this.dataSetAttributeOptionCombo = this.dataValues.getDataValuesSetAttributeOptionCombo(this.dataEntryFormSelectionParameter.dataDimension,dataSets[0].categoryCombo.categoryOptionCombos);
      this.setEntryFormMetaData();
      //setting labels
      this.setHeaderLabel();
    },error=>{
      this.loadingData = false;
      this.setToasterMessage('Fail to load organisation units');
    })
  }

  setEntryFormMetaData(){
    this.setLoadingMessages('Setting Entry form');
    this.entryForm.getEntryFormMetadata(this.selectedDataSet,this.currentUser).then((sections : any)=>{
      this.entryFormSections = sections;
      //setting initial label values
      this.paginationLabel = (this.currentPage + 1) + "/"+this.entryFormSections.length;
      this.setLoadingMessages('Downloading data values from server');
      let dataSetId = this.selectedDataSet.id;
      let orgUnitId = this.dataEntryFormSelectionParameter.orgUnit.id;
      let period = this.dataEntryFormSelectionParameter.period.iso;
      this.dataValues.getDataValueSetFromServer(dataSetId,period,orgUnitId,this.dataSetAttributeOptionCombo,this.currentUser)
        .then((dataValues : any)=>{
          this.setLoadingMessages('Saving ' + dataValues.length + " data values from server");
          let dataDimension = this.dataEntryFormSelectionParameter.dataDimension;
          this.dataValues.saveDataValues(dataValues,dataSetId,period,orgUnitId,dataDimension,"synced",this.currentUser).then(()=>{
            this.getDataValuesFromLocalStorage();
          },error=>{
            this.setToasterMessage('Fail to save data values from server');
            this.getDataValuesFromLocalStorage();
          });
        },error=>{
          this.setToasterMessage('Fail to download data values from server');
          this.getDataValuesFromLocalStorage();
          console.log("error : " + JSON.stringify(error));
        });
    })
  }

  getDataValuesFromLocalStorage(){
    let dataSetId = this.selectedDataSet.id;
    let orgUnitId = this.dataEntryFormSelectionParameter.orgUnit.id;
    let period = this.dataEntryFormSelectionParameter.period.iso;
    let entryFormSections  = this.entryFormSections;

    this.dataValues.getAllEntryFormDataValuesFromStorage(dataSetId,period,orgUnitId,entryFormSections,this.currentUser).then((dataValues : any)=>{
      this.entryFormDataValues = {};
      this.storageStatus.local = 0;
      this.storageStatus.online = 0;
      dataValues.forEach((dataValue : any)=>{
        this.entryFormDataValues[dataValue.id] = dataValue.value;
        dataValue.status == "synced" ? this.storageStatus.online ++ :this.storageStatus.local ++;
      });

      //alert(JSON.stringify(dataValues));
      this.loadingData = false;
    },error=>{
      this.loadingData = false;
    });
  }

  setHeaderLabel(){
    this.selectedDataSetLabel = this.selectedDataSet.name;
    this.selectedOrganisationUnitLabel = this.dataEntryFormSelectionParameter.orgUnit.name;
    this.selectedPeriodLabel = this.dataEntryFormSelectionParameter.period.name;
  }

  changePagination(page){
    page = parseInt(page);
    if(page == -1){
      this.currentPage = 0;
    }else if(page == this.entryFormSections.length){
      this.currentPage = this.entryFormSections.length - 1;
    }else{
      this.currentPage = page;
    }
    this.paginationLabel = (this.currentPage + 1) + "/"+this.entryFormSections.length;
  }

  updateDataSetCompleteness(){
    //@todo update data set completeness
    this.isDataSetCompleted = !this.isDataSetCompleted;
  }

  ionViewDidLoad() {
    //console.log('Hello DataEntryForm Page');
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
