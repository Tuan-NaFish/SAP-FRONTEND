![][image1]

**ABAP CODING CONVENTION VERSION 1.5**

RESTRICTED   
Copyright © 2023 FPT All Rights Reserved.   
![][image2]

**VERSION CONTROL** 

| Prepared by:  | Technical Team |
| :---- | :---- |
| **Date:**  | 01/12/2022 |
| **Reviewed by:**  | Line Manager |
| **Date:**  | 28/12/2022 |
| **Approved by:**  | Line Manager |
| **Date:**  | 28/12/2022 |

**VERSION HISTORY**

| Date  | Version  | Author  | Description |
| :---- | :---- | :---- | :---- |
| 13/01/2010  | 0.01  | ERP.SAP  | First creation |
| 07/06/2016  | 1.0  | ERP.SAP  | 1st release |
| 01/09/2020  | 1.1  | ERP.SAP  | Minor updates |
| 11/12/2021  | 1.2  | ERP.SAP  | Update conventions relating to Classes  development |
| 28/12/2022  | 1.3  | ERP.SAP  | Minor updates |
| 09/01/2023  | 1.4  | ERP.SAP  | Add new guidelines |
| 30/01/2023  | 1.5  | ERP.SAP  | Add new guidelines for RAP |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

Page 2 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image3]

**TABLE OF CONTENT** 

**ABAP CODING CONVENTION................................................................................................................. 1 VERSION CONTROL................................................................................................................................. 2 VERSION HISTORY .................................................................................................................................. 2 TABLE OF CONTENT ............................................................................................................................... 3** 

**1\. OVERVIEW............................................................................................................................... 6** 

1.1 Description ............................................................................................................................ 6 1.2 Target Audience .................................................................................................................... 6 

**2\. GLOSSARY .............................................................................................................................. 7** 

**3\. BASIC CONCEPT / ASSUMPTION.......................................................................................... 8** 

**3.1.1** Master Language ............................................................................................................. 8 **3.1.2** Program Layout................................................................................................................ 8 **3.1.3** Using character ................................................................................................................ 8 **3.1.4** Pretty Printer.................................................................................................................... 8 **3.1.5** ABAP Editor Settings........................................................................................................ 9 

**4\. NAMING CONVENTION .......................................................................................................... 10** 

4.1 ABAP Object naming rule...................................................................................................... 10 **4.1.1** Naming for development objects ..................................................................................... 10 **4.1.2** Name Space..................................................................................................................... 10 **4.1.3** Modules Identifiers........................................................................................................... 10 

4.2 Other naming rules................................................................................................................ 12 4.3 Variables naming rules .......................................................................................................... 12 **4.3.1** Selection Screen .............................................................................................................. 12 **4.3.2** GUI................................................................................................................................... 13 **4.3.3** Program ........................................................................................................................... 13 **4.3.4** Classes, Interfaces and Methods ..................................................................................... 14 4.4 Coding convention ................................................................................................................ 17 **4.4.1** Access to a file ................................................................................................................. 17 **4.4.2** Text element .................................................................................................................... 17 **4.4.3** Program annotation ......................................................................................................... 18 **4.4.4** Program header ............................................................................................................... 19 **4.4.5** Source code tracking ....................................................................................................... 21 

**5\. ABAP SYNTAX......................................................................................................................... 23** 

5.1 Basic Syntaxes ...................................................................................................................... 23 **5.1.1** ABAP Statement .............................................................................................................. 23 **5.1.2** Logical Conditions............................................................................................................ 23 **5.1.3** Assignment Command..................................................................................................... 23 **5.1.4** Operation Statement........................................................................................................ 23 

5.2 Shared function..................................................................................................................... 24 5.3 Declare variable .................................................................................................................... 24 5.4 Declare constant ................................................................................................................... 24 5.5 Check source code................................................................................................................ 24 5.6 Table Maintenance................................................................................................................ 26 

**5.6.1** Nested Selects ................................................................................................................. 26 **5.6.2** SELECT... ENDSELECT.................................................................................................... 26

Page 3 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image4]

**5.6.3** SELECT SINGLE and SELECT UP TO 1 ROWS................................................................ 26 **5.6.4** SELECT FOR ALL ENTRIES ............................................................................................. 26 **5.6.5** SELECT and SELECT \*..................................................................................................... 26 **5.6.6** SELECT … ORDER BY ..................................................................................................... 26 **5.6.7** INSERT, UPDATE, DELETE.............................................................................................. 26 **5.6.8** Lock data ......................................................................................................................... 26 **5.6.9** SY-SUBRC checks ........................................................................................................... 26 

5.7 Subroutines ........................................................................................................................... 27 **5.7.1** Creating Subroutines ....................................................................................................... 27 5.8 Methods ................................................................................................................................ 27 **5.8.1** Methods Call.................................................................................................................... 27 5.9 Internal table ......................................................................................................................... 27 **5.9.1** Work area of internal table............................................................................................... 27 **5.9.2** Avoiding LOOP IN LOOP (Nested Loop).......................................................................... 28 **5.9.3** Improving LOOP IN LOOP (Nested Loop) with Parallel Cursor ....................................... 28 **5.9.4** Reading a record in an internal table ............................................................................... 29 **5.9.5** Release memory .............................................................................................................. 29 5.10 Report Programs ................................................................................................................... 29 5.11 Background program............................................................................................................. 30 5.12 Error detected ....................................................................................................................... 30 5.13 Exception (Error Handling) .................................................................................................... 30 5.14 ABAP Memory ....................................................................................................................... 31 5.15 Obsolete................................................................................................................................ 31 

**6\. CORE DATA SERVICES (CDS)................................................................................................ 32** 

6.1 CDS Naming Convention ...................................................................................................... 32 **6.1.1** General Rule .................................................................................................................... 32 **6.1.2** Prefixes and Suffixes ....................................................................................................... 32 **6.1.3** Field Names ..................................................................................................................... 34 **6.1.4** DCL Source (Access Control)........................................................................................... 35 **6.1.5** Metadata Extension ......................................................................................................... 35 **6.1.6** BOPF Naming Convention ............................................................................................... 35 

6.2 CDS General Guideline ......................................................................................................... 35 **6.2.1** Association for hierarchies, texts and values helps.......................................................... 35 **6.2.2** Formatting........................................................................................................................ 36 **6.2.3** View Extension................................................................................................................. 36 **6.2.4** UNION.............................................................................................................................. 36 

**7\. ABAP RESTFUL APPLICATION PROGRAMMING MODEL (RAP)........................................ 37** 

7.1 RAP Naming Convention....................................................................................................... 37 **7.1.1** ABAP Dictionary Objects.................................................................................................. 37 **7.1.2** CDS Entity........................................................................................................................ 37 **7.1.3** Behavior Definition........................................................................................................... 37 **7.1.4** Metadata Extension ......................................................................................................... 37 **7.1.5** Service Definition ............................................................................................................. 38 **7.1.6** Service Binding ................................................................................................................ 38 **7.1.7** Behaviour Pool................................................................................................................. 38 **7.1.8** Handler and Saver Classes .............................................................................................. 38 

7.2 RAP General Guideline ......................................................................................................... 39 **7.2.1** Required CDS Annotations .............................................................................................. 39 **7.2.2** Use STRICT...................................................................................................................... 39 **7.2.3** Handling of Messages...................................................................................................... 39 **7.2.4** Passing Parameter to RAP Actions. ................................................................................. 41 **7.2.5** Using Virtual Elements in CDS Projection Views.............................................................. 42 **7.2.6** RAP Custom Entity and Queries ...................................................................................... 43

Page 4 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image5]

**7.2.7** Other RAP Guidelines form Standard Document of SAP................................................. 46Page 5 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image6]

**1\. OVERVIEW** 

**1.1 Description** 

This document aims to define the coding convention for ABAP, including the naming rules for  variables, annotation, program convention, etc.  

**1.2 Target Audience** 

ABAP development team, Code Reviewers, Quality Control.

Page 6 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image7]

**2\. GLOSSARY**

| Term  | Description |
| :---- | :---- |
| ABAP  | Advanced Business Applications Programming |
| IDOC  | Intermediate Document |
| SQL  | Structured Query Language |
| BDC  | Batch Data Communications |
| BAPI  | Business Applications Programming Interface |
| RICEFW  | Reports, Interfaces, Conversions, Extensions, Workflow |

Page 7 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image8]

**3\. BASIC CONCEPT / ASSUMPTION** 

In principle, SAP ABAP Help has been described in the company to follow the defined constraints.  Instructions have been deprecated or prohibited by SAP, also holds in this project. 

SAP ABAP Help: https://help.sap.com/doc/abapdocu\_latest\_index\_htm/latest/en-US/index.htm **3.1.1** Master Language 

Set the Master language to English (EN). (absolutely adhere rigidly) 

(When you develop, the logon language must be English.) 

**3.1.2** Program Layout 

All ABAP programs should have an appropriate template for code readability and order. See  section 3.4.4 for further details. 

As a general rule, the programs should be divided into three major sections namely: 

• Data Collection – This is the section that retrieves the data from relevant sources such as  Database tables, files from Application and Presentation servers, IDOCs, etc. 

• Data Processing – This is the section where you process the raw data from the previous  section (Data Collection). 

• Data Output – This is the section where you return the output or information to the user such  as displaying a list, message, form, etc. 

It is preferred that these sections be separated through Subroutines or Methods. 

**3.1.3** Using character 

**3.1.3.1** Source code 

• Use only the alphanumeric character capital letter 

• Use only the following characters for the item name 

0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ\_ 

**3.1.3.2** Comments 

• Write the comment in English 

• Put the comments on Variables, PARAMETERS, SELECT-OPTIONS, Events and  Subroutines 

**3.1.4** Pretty Printer 

Pretty printer should be used to indent the code properly. See the next section \[ABAP Editor  Settings\] for the Pretty Printer settings.

Page 8 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image9]

**3.1.5** ABAP Editor Settings 

SE38 / SE80 → Utilities → Settings... 

![][image10]  
Select Tab Pretty Printer

![][image11]  
Page 9 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image12]

**4\. NAMING CONVENTION** 

**4.1 ABAP Object naming rule** 

**4.1.1** Naming for development objects  

When you choose names for development objects, you should:  

• Use **English** names 

• Use **glossary terms** when possible 

For example, ZCL\_COMPANY\_CODE instead of BUKRS. 

• In compound names, use the **underscore character (\_) as a separator**. Since names are  not case-sensitive, this is the only character you can use to separate names. 

For example, ZCL\_COMPANY\_CODE, ZCL\_GENERAL\_LEDGER\_ACCOUNT. 

• Names **should describe the action**, not the implementation of the action. 

For example, PRINT\_RECTANGLE, not RECTANGLE\_TO\_SPOOL. 

**4.1.2** Name Space 

| No.  | ID  | Text  | Description |
| :---- | :---- | ----- | :---- |
| 1  | /FPT/  | FPT Name Space  | For FPT Template Objects and FPT Solutions |
| 2  | Z\*  | Common Name Space  | For Developing in common name space |
| 3  | Y\*  | Testing Common Name Space  | For Test Programs or Training Programs |

**4.1.3** Modules Identifiers

| Module / Submodule  |  | Module Name  | Module Identifier |
| ----- | :---- | :---: | :---: |
| **Global (Cross Application)**  |  | CA  | CA |
| **Financial   Accounting**  | **Global**  | FI  | FI |
|  | **General Ledger Accounting**  | FI-GL  | GL |
|  | **Account Payable**  | FI-AP  | AP |
|  | **Account Receivable**  | FI-AR  | AR |
|  | **Asset Accounting**  | FI-AA  | AA |

Page 10 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image13]

**Treasury and Risk Management** FI-TRM TM

|  | Profit Center Accounting  | EC-PCA  | PC |
| :---- | :---- | :---: | :---: |
| **Controlling**  | **Global**  | CO  | CO |
|  | **Cost Center Accounting**  | CO-CCA  | CC |
| **Financial   Supply Chain  Management**    | **Global**  | FSCM  | FS |
|  | **Cash Management**  | FSCM-CM  | CM |
|  | **Receivable Accounting**  | FSCM-COL  | CL |
|  | **Liquidity Planner**  | FSCM-LP  | LP |
|  | **Cash Flow**  | CF  | CF |
| **Local Consolidation**  |  | EC-CS  | CS |
| **Logistics**  | **Global**  | LO  | LO |
|  | **Sales Management**  | SD  | SD |
|  | **Material Management**  | MM  | MM |
| **HR-TV**  |  | HR-TV  | TV |
| **BW**  |  | BW  | BW |
| **Business Planning and Consolidation**  |  | BPC  | BP |
| **ALE (Application Link Enabling)**  |  | ALE  | AL  |
| **AIS (Audit Information System)**  |  | AIS  | AI |
| **Shared Service Framework**  |  | SSF  | SS |
| **Basis**  |  | BC  | BC |

Page 11 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image14]

**4.2 Other naming rules** 

***Other specific naming rules will be set by discussion with customer***. Project should defined a  separate Naming Rule File after the disscussion. 

For example, intead of using English names, customers may prefer to use Module Identifier and  Numbering like the example below. 

| Digit  | 1  | 2  | 3-4  | 5-11 |
| :---- | :---- | ----- | :---- | :---- |
| **Content  Set** | Fixing  | Program Type  | Module Component  | Name |
|  | “Z”  | “R” : Report  “B” : Batch | \<Identifier defined  by project rules\>   e.g., SD, MM, FI, AC,  AS, QM, PP, etc. | \#\#\#\#\#\#  6 numbers that is   registered in Project   Program List as Program  ID |

Result: ZRSD000001, ZBMM000012 

\* This is example. 

**4.3 Variables naming rules** 

When you name variables, you should 

• Use the underscore character (\_) as a separator. Do not use “-” to avoid conflict. • Subroutine, function module are considered as Local Parameters. 

**4.3.1** Selection Screen 

| Category | Naming |  | Description |
| ----- | :---: | ----- | ----- |
|  | **Global**  | **Local** |  |
| PARAMETERS (Field)  | N/A  | P\_\*  | Parameters are only up to 8 characters. |
| PARAMETERS (Checkbox)  | N/A  | CB\_\*  | Parameters are only up to 8 characters. |
| PARAMETERS (Radio Button)  | N/A  | RB\_\*  | Parameters are only up to 8 characters. |
| Radio button group  | N/A  | RG\* | Radio button group is up to 4 characters only.  Example: RG01, RG99 |
| SELECT-OPTIONS  | N/A  | S\_\*  | Select Options can only be up to 8 characters. |
| Block  | N/A  | BL\_\* |  |

Variable name should be the same as table field or data element.  

Example: P\_BUKRS TYPE BUKRS to define company code. 

Page 12 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image15]

*(P\_COMPANY\_NAME is not possible because Selection Screen Parameters and Select-Options support only 8-characters names)* 

**4.3.2** GUI 

| Category  | Naming rule  | Description |
| ----- | :---: | ----- |
| Box  | GRP\* | If the group heading is not fixed, you should follow the  program naming rule.  |
| Push Button  | CMD\*  | If the textual label is not fixed, you should follow the  program naming rule.  |
| Function Codes  | ZXXX  | Where XXXX is a four letter description |
| Table Control  | TCL\* |  |
| Tab Control  | TAB\* |  |
| Tab command  | TB\_\* | If the textual label is not fixed, you should follow the  program naming rule. |
| Subscreen Area  | SUB\* |  |
| Custom Control  | CUS\* |  |
| Screen field  | \* | The screen field should refer to structure, table or view to  ABAP dictionary. |
| Combo box  | \*  | Use Listbox with key. |
| Group box  | G\* | \* is the sequential number to define the customizing group  of the field.   Example: group box of General Address in Customer Master  Data  |

**4.3.3** Program

| Category  | Global  | Local |
| ----- | ----- | ----- |
| Constant (CONSTANTS)  | GC\_\*  | LC\_\* |
| General variable  | GV\_\*  | LV\_\* |
| Statics  | N/A  | ST\_\* |
| Flag variable  | GV\_FLG\_\*  | LV\_FLG\_\* |
| Counter variable  | GV\_CNT\_\*  | LV\_CNT\_\* |

Page 13 of 46   
Copyright © 2023 FPT All Rights Reserved. 

| Category  | Global  | Local |
| ----- | ----- | ----- |
| Ranges  | GR\_\*  | LR\_\* |
| Macros  | GM\_\*  | LM\_\* |
| Internal table  | GT\_\*  | LT\_\* |
| Work area / Structure  | GS\_\*  | LS\_\* |
| Structure type  | GTY\_\*  | LTY\_\* |
| Type (table type)  | GTY\_T\_\*  | LTY\_T\_\* |
| Field symbol  | \<GFS\_\*\>  | \<LFS\_\*\> |

Variable name should be the same as table field or data element.  

Example: GV\_BUKRS TYPE BUKRS to define company code.  

**4.3.4** Classes, Interfaces and Methods 

**Classes, Interfaces**

| Global Class in the class library  | ZCL\_\<class name\>  The class name should consist of singular nouns. ZCL\_COMPANY\_CODE,   ZCL\_GENERAL\_LEDGER\_ACCOUNT |
| :---- | :---- |
| **Global Interfaces in the class library**  | ZIF\_\<interface name\>  The same naming convention as for classes.  ZIF\_STATUS\_MANAGEMANT, ZIF\_CHECKER |
| **Local classes in programs   (recommendation)** | LCL\_\<class name\>  The class name should consist of singular nouns. LCL\_TREE\_MANAGEMENT |
| **Local interfaces in programs   (recommendation)** | LIF\_\<interface name\>  The same naming convention as for classes.  LIF\_PRINTER |

Page 14 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**Methods** 

 All Methods should be named in 61 characters. The Method name should be a verb phrase. You can  split between words by an underscore \_. The only exception to this would be the CONSTRUCTOR method. 

| Normal Methods  | \<any name must begin with verb\> |
| :---- | :---- |
| **Attribute access** | SET\_\<attribute name\>, GET\_\<attribute name\>  Methods that access attributes of any kind should have the prefix  GET\_ or SET\_.  GET\_STATUS, SET\_USE\_COUNT |
| **Events Handling Methos** | ON\_\<event name\>  Methods that handle events should begin with ON, followed by the  name of the event that they handle.  ON\_BUTTON\_PUSHED, ON\_BUSINESS\_PARTNER\_PRINTED |
| **Methods that perform type  conversions** | AS\_\<new type\>  AS\_STRING, AS\_ISOCODE |
| **Methods that return a   Boolean value** | IS\_\<adjective\>  IS\_OPEN, IS\_EMPTY, IS\_ACTIVE  These methods may not return any exceptions. |
| **Check methods** | CHECK\_\<objective\>  CHECK\_AUTHORIZATION, CHECK\_PROCESS\_DATE |

Example: GET\_STATUS, CREATE\_ORDER, DETERMINE\_PRICE 

METHOD GET\_DATA. 

… 

ENDMETHOD. 

**Method Parameters** 

The parameters are regarded from the point of view of the method that implements them:Page 15 of 46   
Copyright © 2023 FPT All Rights Reserved. 

| Category  | Naming rule |
| ----- | ----- |
| IMPORT  | IM\_\* |
| EXPORT  | EX\_\* |
| CHANGING  | CH\_\* |
| RETURNING  | RE\_\* |

**Events** 

 All Events should be named in 61 characters. The **Event names** should have the form  \<noun\>\_\<participle\>. 

| Events  | \<noun\>\_\<participle\>. |
| :---- | :---- |

Example: BUTTON\_PUSHED, COMPANY\_CODE\_CHANGED, BUSINESS\_PARTNER\_PRINTED 

**4.3.5** Subroutine 

| Category  | Local |
| ----- | ----- |
| General Variable  | \* |
| Flag Variable  | \*\_FLG\_\* |
| Counter Variable  | \*\_CNT\_\* |
| Internal table  | \*\_T\_\* |
| Structure (work area)  | \*\_S\_\* |
| Undefined type  | \*\_P\_\* |

Variable name should be the same as table field or data element. 

Example: I\_BUKRS TYPE BUKRS to define company code.

| Category  | Naming rule |
| ----- | ----- |
| USING  | I\_\* |
| CHANGING  | C\_\* |

Page 16 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**4.3.6** Function Module 

| Category  | Naming rule |
| ----- | ----- |
| IMPORT  | I\_\* |
| EXPORT  | E\_\* |
| CHANGING  | C\_\* |
| TABLES  | T\_\* |

Variable name should be the same as table field or data element. 

Example: I\_BUKRS TYPE BUKRS to define company code. 

**4.4 Coding convention** 

**4.4.1** Access to a file 

When you want to access a file located in the server, you should state the logical path to avoid the  dependency of operating system. 

Create the Logical Path in TCODE FILE. 

**4.4.2** Text element 

This section describes how to design texts. You should use the text element instead of fixed text.  

Example: Instead of fixing a message text like “Data cannot be saved”, create a text element TEXT 001 and enter the description “Data cannot be saved”. By this way, you have the option to translate  the text in different languages if required. 

**4.4.2.1** Text element category

| Category  | Description  | Usage |
| ----- | ----- | ----- |
| List header/row  header | To design the report title and column  heading.  | Do not use this function.   Use the key word WRITE and event TOP-OF PAGE to design the header.  |
| Selection text  | To display the documentation help of the  field in the selection screen | To display the documentation help of the field  in the selection screen |
| Text symbol  | Do not hard-code texts in your program.  Text symbols should be used in the  program and should be numbered from  001\.  | To display the message, report title, replace  hardcoded literals… |

Page 17 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**4.4.3** Program annotation 

Annotation aims to explain the functionality, usage or modification.  

**4.4.3.1** Program annotation rule 

• Annotation should be English.  

• Use \* to note at the beginning of the line. 

• Use “ to note in the middle of line. 

• Use the below template for Annotations per section. 

Template.docx 

**4.4.3.2** Annotation for variables declaration 

Annotation should be in right side of the variables. In the case of the annotation is too long, it can  be placed in the previous line. 

Example: 

DATA: 

 LV\_GPART\_CNT TYPE I. “ Number of Business Partner 

DATA: 

\* Account Balance Of Business Partner 

 LT\_BUT000 TYPE STANDARD TABLE OF BUT000. 

**4.4.3.3** INCLUDE 

Annotation should be in right side of the INCLUDE. In the case of the annotation is too long, it can  be placed in the previous line. 

Example: 

INCLUDE ZINRM01\_TOP. " Global data 

INCLUDE ZINRM01\_F01. " Subroutine 

INCLUDE ZINRM01\_O01. " Process before output 

INCLUDE ZINRM01\_I01. " Process After Input

Page 18 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**4.4.3.4** SELECT function 

To describe the functionality of SELECT function. 

\*\*--------------------------Select function------------------------------\* CASE OPT; 

 WHEN ‘DISP'. 

 WHEN ‘EDIT'. 

END CASE. 

\*\*--------------------------Select function------------------------------\* **4.4.3.5** Call Subroutine or Function Module 

Annotation should be placed in the previous line. 

Example: Function module 

\* Open BDC session 

CALL FUNCTION 'BDC\_OPEN\_GROUP' 

EXPORTING.... 

Subroutine 

\* Open batch input session 

PERFORM BDC\_OPEN. 

**4.4.3.6** Other annotations 

Annotation is mandatory for IF command or complex ABAP command. 

Example: 

DATA GC\_DISP(4) TYPE C VALUE ‘DISP’. “ Display mode IF OPT \= GC\_DISP. " when the option is a display mode  LV\_CNT \= LV\_CNT \+ 1\. " increase the counter  

**4.4.4** Program header  

**4.4.4.1** Header of the main program  

Annotation required at the header of the main program. 

\*\*---------------------------------------------------------\* 

\*\* Program ID: XXXXXX 

\*\* Program name: XXXXXXXXXXXXXXX 

\*\* RICEFW ID: RM1.2\_001 

\*\* Created by: 

Page 19 of 46   
Copyright © 2023 FPT All Rights Reserved. 

\*\* Created date: 

\*\* Content explanation: Content line 1 

\*\* content line  

\*\*---------------------------------------------------------\* 

\*\* \<Modification tracking\> 

\*\* Modification number: XXXXXXXXX 

\*\* Modification day:  

\*\* Modification reason: (after release in testing environment)  

\*\* 

\*\*---------------------------------------------------------\* 

**4.4.4.2** Header of program INCLUDE 

Header of program INCLUDE should be noted as below. 

\*&---------------------------------------------------------------------\* \* INCLUDE \<Include Name\> 

\*&---------------------------------------------------------------------\* \* \<Content Explanation\> 

\*&---------------------------------------------------------------------\* 

**4.4.4.3** Header of Subroutine  

Header of subroutine should be noted as below. 

\*&---------------------------------------------------------------------\* \*& Form \<SUBROUTINE NAME\> (Uppercase) 

\*&---------------------------------------------------------------------\* \* \<Subroutine processing detail\> 

\*----------------------------------------------------------------------\* \* \--\> I\_IN : \<Input meaning\> 

\* \<-\> CT\_TEXT : \<In/Output meaning\> 

\* \<-- C\_OUT : \<Output meaning\> 

\*----------------------------------------------------------------------\* FORM \<SUBROUTINE NAME\>. 

**4.4.4.4** Header of Function module  

Header of function module should be noted as below.

Page 20 of 46   
Copyright © 2023 FPT All Rights Reserved. 

\*\*---------------------------------------------------------\* 

\*\* Function ID: XXXXXX 

\*\* Function name: XXXXXXXXXXXXXXX 

\*\* RICEFW ID: RM1.2\_001 (RICEFW item of function module) 

\*\* Created by:  

\*\* Created date: 

\*\* Content explanation: Content line 1 

\*\* content line 2 

\*\*---------------------------------------------------------\* 

\*\* \<Modification tracking\> 

\*\* Modification number: XXXXXXXXX 

\*\* Modification day:  

\*\* Modification reason:  

\*\* 

\*\*---------------------------------------------------------\* 

**4.4.5** Source code tracking 

After being released to test/production environment, the program or the Function Module may have  bugs or change request. You should track these modifications. 

**4.4.5.1** Add note to main program’s header or function module 

\*\*---------------------------------------------------------\* 

\*\* \<Modification tracking\> 

\*\* Modification number: A00000001 (BUG ID for Change Request ID) \*\* Modification date: 12/12/2009 

\*\* Modification reason: Modification content line 1  

\*\* Modification content line 2 

\*\*---------------------------------------------------------\* \*\* \<Modification tracking\> 

\*\* Modification number: A00000002 (BUG ID for Change Request ID) \*\* Modification day: 15/12/2009 

\*\* Modification reason: Modification content 2 line 1  

\*\* modification content 2 line 2 

\*\*---------------------------------------------------------\*Page 21 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**4.4.5.2** Add or change a line  

To add or change a line, you should note:  

Example: 

Before modification: 

WRITE :/01 TEXT-001. 

After modification:  

\* \<Modification Number\> \<Modification Date\> \<Modification By\> \- START \* WRITE :/01 TEXT-001. “ DEL XXXXXXXX 

WRITE :/01 TEXT-002. “ ADD XXXXXXXX 

\* \<Modification Number\> \<Modification Date\> \<Modification By\> \- END 

Do not delete any line. If a significant modification is required, you should create a new version and  delete the old one.  

XXXXXXXX is the description of the annotation

Page 22 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5\. ABAP SYNTAX** 

**5.1 Basic Syntaxes** 

**5.1.1** ABAP Statement 

Every ABAP statement should be on a single line. In case of the SELECT statement, every clause  like FROM, WHERE etc should be on a different line. A maximum of 3 Field Selection should be  written on each line. 

Example : 

SELECT matnr mtart meins 

 brgew ntgew gewei 

FROM mara 

 INTO TABLE gt\_mara 

WHERE matnr \= p\_matnr 

 AND lvorm \<\> gc\_X. 

**5.1.2** Logical Conditions 

• Always use the symbolic operator (i.e. \<\>, \= , \<=, etc) instead of the letter operator (i.e. EQ,  GE, GT, LE, etc) in ABAP and SQL conditions. 

• Each AND or OR statement should be on separate lines. 

Examples : 

1\) IF GV\_bukrs \= p\_bukrs 

AND GV\_werks \<\> p\_werks. 

2\) SELECT bukrs 

 FROM T001 

 INTO TABLE gt\_bukrs 

WHERE bukrs \= p\_bukrs. 

**5.1.3** Assignment Command 

Use "=" for value assignment 

※ Do not use “MOVE \~ TO \~” instruction, except for MOVE-CORRESPONDING 

**5.1.4** Operation Statement  

Do not use following statements: ADD，SUBTRACT，MULTIPLY，DIVIDE

Page 23 of 46   
Copyright © 2023 FPT All Rights Reserved. 

Abbreviate the COMPUTE statement, and Unify operator 

• Add : A \= B \+ C 

• Subtract : A \= B – C 

• Multiply : A \= B \* C 

• Divide : A \= B / C 

• Quotient of Division(Integer) : A \= B DIV C 

• Remainder of Division : A \= B MOD C 

• Index Calculation : A \= B \*\* C 

**5.2 Shared function** 

If there are universe of different functions which are shared in different programs, you should use  INCLUDE or Function Module. 

**5.3 Declare variable**  

Always use TYPE statement to declare variable. In some special case, use LIKE statement.  

E.g., 

DATA: GV\_COMPCODE TYPE BSID-BELNR. 

**5.4 Declare constant** 

Use CONSTANTS statement to declare constant. Use this declaration in the program instead of the  constant value.  

**5.5 Check source code** 

After finishing the source code, you should run the function of source code checking and correct any  warning.  

From ABAP Editor (SE37, SE38, SE80), run Program-\>Check-\>Extended Program Check.Page 24 of 46   
Copyright © 2023 FPT All Rights Reserved. 

Tick all checkboxes, except the last one. 

Correct any warning. 

Page 25 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5.6 Table Maintenance** 

Do not use INSERT, UPDATE, DELETE statement for standard table, use BAPI or Function module instead. 

**5.6.1** Nested Selects 

The performance of nested SELECT loops is very poor. Hence, do not use nested SELECT, except  the case of large data.  

**5.6.2** SELECT... ENDSELECT 

ENDSELECT should only be used if the UP TO 1 ROWS condition is added. 

**5.6.3** SELECT SINGLE and SELECT UP TO 1 ROWS 

Use SELECT SINGLE to read database records with primary key.  

In the absence of the primary key, use UP TO 1 ROWS. 

**5.6.4** SELECT FOR ALL ENTRIES 

You should check the following matters: 

• Internal table should not be empty. If it is empty, then all rows will be retrieved.  

• Ensure the retrieved records will contain no duplicates because SAP automatically removes  any duplicates from the rest of the retrieved records. 

**5.6.5** SELECT and SELECT \* 

In general, use a SELECT statement specifying a list of fields instead of a SELECT \* to reduce  network traffic and improve performance 

**5.6.6** SELECT … ORDER BY 

Do not use ORDER BY to sort data. Data will be sorted in the internal table.  

**5.6.7** INSERT, UPDATE, DELETE 

Use Open SQL to insert/update/delete, do not use Native SQL. Make sure that the program issues  COMMIT WORK or ROLLBACK WORK statements after inserting, updating or deleting. Use  COMMIT WORK if sy-subrc equals to zero, else, write ROLLBACK WORK. 

**5.6.8** Lock data 

Set database lock before it receives change statements (**INSERTS, UPDATE, MODIFY, DELETE**) if it is required and evaluation is done before using the ENQUEUE and DEQUEUE functionality. 

**5.6.9** SY-SUBRC checks 

SY-SUBRC should be checked after every SELECT Statement that requires processing based on  success or unsuccessful data retrieval.

Page 26 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5.7 Subroutines** 

**5.7.1** Creating Subroutines 

Subroutines should be used for modularization of the code and improving code readability. When  creating subroutines, add the prefix f\_ to your form.  

Example: 

 PERFORM f\_add\_counter. 

**5.8 Methods** 

**5.8.1** Methods Call 

**Formulate static method calls without CALL METHOD.** 

Use the long form of the method call using CALL METHOD only for dynamic method calls. 

**Bad Example:** 

The following source code shows the long form of a static method call using CALL METHOD, which  is no longer recommended. 

... 

CALL METHOD cl\_class=\>do\_something 

 EXPORTING 

 some\_input \= value1. 

... 

**Good Example:** 

The following source code shows the same method call as above, but as recommended, without  CALL METHOD. If a method has only importing parameters, IMPORTING and CHANGING can be  omitted, and also the EXPORTING addition. If it is a single importing parameter, its name can also  be omitted. 

... 

cl\_class=\>do\_something( EXPORTING some\_input \= value1 ). 

**5.9 Internal table** 

**5.9.1** Work area of internal table 

Do not use header line, use work areas or field-symbols. Do not use TABLE when specifying  parameters of subroutine.  

Example: 

TYPES: BEGIN OF y\_bseg,

Page 27 of 46   
Copyright © 2023 FPT All Rights Reserved. 

 bukrs TYPE bseg-bukrs, 

 belnr TYPE bseg-belnr, 

 wrbtr TYPE bseg-wrbtr, 

 END OF y\_bseg. 

DATA: gt\_bseg TYPE STANDARD TABLE OF y\_bseg, 

 gs\_bseg TYPE y\_bseg. 

PERFORM f\_get\_data USING gt\_bseg. 

FORM f\_get\_data USING t\_bseg LIKE gt\_bseg. 

 SELECT bukrs 

 belnr 

 wrbtr 

 FROM bseg 

 INTO TABLE t\_bseg 

 WHERE bukrs \= p\_bukrs 

 AND belnr IN s\_belnr. 

ENDFORM. " F\_GET\_DATA 

**5.9.2** Avoiding LOOP IN LOOP (Nested Loop) 

Avoid using nested LOOPs to improve performance.  

Use SQL techniques like using FOR ALL ENTRIES or INNER JOIN. 

**5.9.3** Improving LOOP IN LOOP (Nested Loop) with Parallel Cursor 

IF your business logic cannot void nested LOOP, try to improve it with Parallel Cursor technique. 

For improved program performance, to determine which loop is better, and try to minimize  memory load. 

Specify the first index and break statement in inside Loop statement, try to minimum sequential  search.

| LOOP AT it\_vbak ASSIGNING \<lfs\_vbak\>.   READ TABLE it\_vbap TRANSPORTING NO FIELDS   WITH KEY vbeln \= \<lfs\_vbak\>-vbeln   BINARY SEARCH.   IF sy-subrc EQ 0\.   LOOP AT it\_vbap FROM sy-tabix " \<\< minimum sequential search |
| :---- |

Page 28 of 46   
Copyright © 2023 FPT All Rights Reserved. 

|  ASSIGNING \<lfs\_vbap\> .   IF \<lfs\_vbap\>-vbeln \<\> \<lfs\_vbak\>-vbeln.   EXIT.   ENDIF.  \* Rest of the logic would go from here...   ENDLOOP.   IF \<lfs\_vbap\>-kwmeng IS NOT INITIAL.   " This would be next subsequent entry in the table IT\_VBAP  ENDIF.   ENDIF.  ENDLOOP. |
| :---- |

**5.9.4** Reading a record in an internal table 

**Use BINARY SEARCH** for better performance.  

Explicit BINARY SEARCHES should only be used on sorted Standard Internal Tables. SY-SUBRC should be checked after READ TABLE. 

**5.9.5** Release memory 

All internal tables should be freed from memory if it is no longer used by succeeding processes of  the program. To do this, use the FREE command.  

Use Local Data instead of Global Data also help in memory management. Local Data will be  deallocated automatically after going out of scope. 

**5.10 Report Programs** 

ALV is preferred than classical reports. 

**5.10.1** Output of report of amount of money item 

Use CURRENCY option 

**5.10.2** Output of report of numeric item with unit 

Use UNIT option 

**5.10.3** Output of report of amount of money & numeric item 

Output right justified. 

**5.10.4** Output of common report header information 

Use the common feature.

Page 29 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5.10.5** Error message in START-OF-SELECTION Event 

Do not use message as TYPE: E.  

Use DISPLAY LIKE 'E' option. 

**5.11 Background program** 

The message will be displayed on the Job Log Entries. The program will be terminated if the message  type \= E, A, X. Therefore, when the error type E, A, X happen, the program should log all other  messages and terminate function have to be processed. 

**5.12 Error detected** 

**5.12.1** Error detected in subroutine 

Use SY-SUBRC command for error detected in subroutine.  

**5.12.2** Error detected in BAPI 

Use RETURN command for error detected in BAPI and the appropriate action  

(i.e. COMMIT WORK or ROLLBACK WORK) should be done where applicable. 

**5.12.3** Error detected in function module 

Use EXCEPTION command for error detected in Function Module.  

**5.13 Exception (Error Handling)** 

As a rule, the judgment by the return code is indispensable. 

However, describe the reason to the comment when error handling is unnecessary in the inquiry  and the report function, etc. 

Processing outside the typical example is described as follows. 

**5.13.1** Zero divide 

When denominator is 0, do not execute the calculation processing and implement the  exception handling matched to the requirement. 

**5.13.2** Numeric overflow 

In all the total processing etc., implement the error correspondence by “TRY\~CATCH” syntax when there is a possibility of the overflow. 

Overflow ：CX\_SY\_ARITHMETIC\_OVERFLOW

Page 30 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5.13.3** Other 

You must mount the error correspondence if necessary by using “TRY\~CATCH” syntax when  it can be handled the exception by exception class. 

Overflow at SQL SUM ：CX\_SY\_OPEN\_SQL\_DB 

Overflow at transfer ：CX\_SY\_CONVERSION\_OVERFLOW 

※Overflow at conversion of CHAR→PACK 

**5.14 ABAP Memory** 

Use the FREE command to clear Memory ID’s after use. 

**5.15 Obsolete** 

Do not use obsolete command in SAP ECC 6.0 and S/4HANA because they are noted as  Error/Warning when running Program Extended Check.

Page 31 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**6\. CORE DATA SERVICES (CDS)** 

**6.1 CDS Naming Convention** 

**6.1.1** General Rule 

CDS view names should consist of up to 4 elements, which are illustrated in the following  example. 

**Example** 

ZC\_ProfitAndLossQ\_2 

The naming elements in the example are broken up and explained in more detail in the  following table. 

| Naming   Elements | Example  | Explanation |
| ----- | ----- | ----- |
| Prefix  (obligatory) | ZC\_  | Indicates the view type (here: consumption view)  and is separated from the core name with an  underscore. |
| Semantic name (obligatory) | ProfitAndLoss  | Based on business semantics and indicates what  the CDS view is about (here: the movement of  goods). |
| Suffix  (optional) | Q  | Defines the purpose of the view further. Here,  we're dealing with an analytical query view. |
| Version number (optional) | \_2  | If there's more than one version of a view,  subsequent versions receive a version number.  The number is separated from the semantic name  or suffix with an underscore. |

**6.1.2** Prefixes and Suffixes 

The different VDM view types are easily recognized by their prefix.

| SAP Standard Prefix  | FPT Prefix  | View Type |
| :---: | :---: | :---: |

Page 32 of 46   
Copyright © 2023 FPT All Rights Reserved. 

| I\_  | ZI\_  | Basic interface view  Composite interface view |
| :---: | :---: | :---- |
| C\_  | ZC\_  | Consumption view |
| R\_  | N/A  | Basic restricted reuse views  Composite restricted reuse views |
| P\_  | N/A  | Private view |
| A\_  | ZA\_  | Remote API view |
| X\_  | N/A  | View extends |
| E\_  | ZE\_  | Extension include view |
| F\_  | ZF\_  | Derivation function |
| D\_  | ZD\_  | Abstract entity |
| N/A  | YI\_, YC\_, YE\_, YA\_  | Test View or Training View |

The following table summarizes the most common suffixes and the respective view types used in  the VDM:

| Suffix  | View Type |
| :---: | ----- |
| Query, Qry, or Q  | Analytical query view |
| Cube or C  | Analytical cube view |
| Text, Txt, T  | Provider for language-dependent  text |
| TP  | Transactional processing view |
| VH  | Value help view |

Page 33 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**6.1.3** Field Names 

Field names are based on business semantics to make their purpose more transparent. They  typically fulfil the following criteria: 

• Uniformity and avoidance of ambiguity: 

The same name for the same entity everywhere; different names for distinct entities. • Legibility by using camel case: For example, **CostCenter**. 

• Avoidance of abbreviations: 

• Standardized abbreviations can be used if necessary to stay within the 30 characters limit. The following table is a non-exhaustive list of different semantic field types with some examples.

| Representation  Term | Definition  | Example Field Names |
| :---: | ----- | ----- |
| Identifier  | A value identifying an   instance of an object. | BankAccount (human-readable identifier) BankAccountUUID (technical identifier) |
| Code  | A value from a range of  possible values. | CorrespondenceLanguage  TransactionCurrency |
| Indicator  | A Boolean truth value (true  or false). | OrderIsReleased |
| Amount  | A monetary amount.  | TaxAmount |
| Date  | A calendar date.  | GoodsArrivalDate |
| Time  | A specific time of day.  | ShiftDay1EndTime |
| Date and Time  | A calendar date and a time  on that date. | CreationDateTime |
| Quantity  | A countable or measurable  quantity. | InspectedProductQuantity |
| Text  | Textual information.  | GoodsLocationText |
| Duration  | The duration between two  points in time. | ServiceWorkDuration |

Page 34 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**6.1.4** DCL Source (Access Control) 

DCL view names should be the same as the CDS View which it is granting access. **6.1.5** Metadata Extension 

Metadata Extension names should be the same as the Consumption CDS View which it is  annotating. 

**6.1.6** BOPF Naming Convention 

**6.1.6.1** Draft Table 

We use suffix “\_D” for Draft Table  

| Digit  | 1  | 2-14  | 15-16 |
| ----- | :---: | :---: | :---: |
| **Content Set**  | Prefix  | Add-on table ID  | Suffix |
|  | “Z” or “Y”  | ID of the add-on table as the source of the draft table.  | “\_D” |

**6.1.6.2** Interface ID 

Adopted automatically suggested code when generating BOPF. 

**6.1.6.3** Determination, Validation and Action Class 

| Determination class  | ZCL\_D\_\<class name\>  The class name should consist of singular nouns. |
| :---- | :---- |
| **Validation class**  | ZCL\_V\_\<class name\>  The class name should consist of singular nouns. |
| **Action class**  | ZCL\_A\_\<class name\>  The class name should consist of singular nouns. |

**6.2 CDS General Guideline** 

**6.2.1** Association for hierarchies, texts and values helps 

• Associate dimension to dimension fields to take advantage of attributes, hierarchies, texts and  values helps. 

For example:  

o Associate I\_Customer to Customer field to enable texts and values helps.

Page 35 of 46   
Copyright © 2023 FPT All Rights Reserved. 

o Associate I\_GLAccount to GLAccount field to enable hierarchies, texts and values helps 

**6.2.2** Formatting 

• If needed, cast custom fields to SAP data elements to get the right descriptions and formatting. • Annotate Quantity and Amount fields with Unit of measures and Currency to ensure correct  aggregation and presentation. 

**6.2.3** View Extension 

• If you extend standard CDS view with custom fields then name custom fields starting with Z to  avoid future naming collisions with SAP standard fields. 

For example: ZAdditionalField1 

**6.2.4** UNION 

• Use UNION ALL instead of UNION where applicable to improve performance.Page 36 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**7\. ABAP RESTFUL APPLICATION PROGRAMMING MODEL (RAP)** 

**7.1 RAP Naming Convention** 

**7.1.1** ABAP Dictionary Objects 

Use a suffix for database tables in scenarios, in which multiple technical representations of the  same semantic data is necessary, for example in draft scenarios. 

Use the suffix. 

• D\_ for the draft database table. 

Example: /FPT/MYTABLE\_D or ZMYTABLE\_D 

**7.1.2** CDS Entity 

This naming convention for RAP bases mostly on CDS View Convention 

| SAP Standard Prefix  | FPT Prefix  | View Type |
| :---: | :---: | ----- |
| I\_  | ZIR\_  /FPT/IR\_ | Root Entity view |
| I\_  | ZI\_  /FPT/I\_ | Normal/Child Entity View |
| C\_  | ZCR\_  /FPT/CR\_ | Root Projection View  Or Root Custom Entity |
| C\_  | ZC\_  /FPT/C\_ | Normal/Child Projection View |

**7.1.3** Behavior Definition 

A behavior definition has always the same name as the root entity of the business object. For example: /FPT/IR\_SalesCredit, ZC\_SalesCreditReport 

**7.1.4** Metadata Extension 

A metadata extension has the same name as the CDS entity it relates to. If you use more  than one metadata extension for one CDS entity, you can add a numbered suffix. 

For example: /FPT/CR\_SalesOrder, ZC\_SalesCreditReport

Page 37 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**7.1.5** Service Definition 

Since a service definition \- as a part of a business service \- does not have different types  or different specifications, there is (in general) no need for a prefix or suffix to  differentiate meaning, but in FPT we add SD\_ prefix to help documentation. 

Example: /FPT/SD\_SalesCredit, ZSD\_SalesCreditReport 

However, in use cases where no reuse of the same service definition is planned for UI  and API services, the prefix may follow the rules of the service binding. 

Example: /FPT/SD\_SalesCreditAPI, ZSD\_SalesCreditReportUI 

**7.1.6** Service Binding 

Use the prefix. 

o **UI\_** if the service is exposed as a UI service. 

o **API\_** if the service is exposed as Web API. 

Use the suffix. 

o **\_O2** if the service is bound to OData protocol version 2\. 

o **\_O4** if the service is bound to OData protocol version 4\. 

For Example: /FPT/UI\_SalesRep\_O2, ZAPI\_SalesCredit\_O4 

**7.1.7** Behaviour Pool 

Use the prefix. 

o **BP\_** for an ABAP class that implements the behaviour of a business object. For Example: /FPT/BP\_SalesReport, ZBP\_SalesPurchaseApp 

**7.1.8** Handler and Saver Classes 

Use the prefix. 

o **LHC\_** for a local handler class. 

o **LSC\_** for a local saver class.

Page 38 of 46   
Copyright © 2023 FPT All Rights Reserved. 

Depending on the modularization of your behaviour implementation, you can provide the  semantics of the coding in the name of the classes. 

Example: LHC\_SALEPURCHASE \_CREATE 

Example: LHC\_CUSTOMER\_CUD 

**7.2 RAP General Guideline** 

**7.2.1** Required CDS Annotations 

All view must enable metadata extension by adding below annotation (for future  extension): 

| @Metadata.allowExtensions: true |
| :---- |

**7.2.2** Use STRICT. 

Use “strict;” in program that will be delivered to customer. 

(From ABAP 7.57 use can use “strict(2);”, but you need to discuss with customer or  technical leader before using it) 

You can read more details on strict mode here:    
https://help.sap.com/doc/abapdocu\_latest\_index\_htm/latest/en   
US/index.htm?file=abenc0\_provider\_rules\_bdef.htm 

**7.2.3** Handling of Messages. 

**7.2.3.1** Message Wrapper-Class 

• Message Class in RAP must implement the specialized interface    
IF\_ABAP\_BEHV\_MESSAGE. 

• To distinguish the classes for messages from exception classes and usual ABAP classes,  their name should start with **ZCM\_** instead of ZCX\_ or ZCL\_. 

• Sample of a Message Wrapper-class

| CLASS ZCM\_FSO\_INVMSG DEFINITION   PUBLIC   INHERITING FROM cx\_static\_check   FINAL   CREATE PUBLIC.   PUBLIC SECTION.   INTERFACES if\_abap\_behv\_message.   INTERFACES if\_t100\_message.   INTERFACES if\_t100\_dyn\_msg. |
| :---- |

Page 39 of 46   
Copyright © 2023 FPT All Rights Reserved. 

|  METHODS constructor   IMPORTING   \!im\_textid LIKE if\_t100\_message\=\>t100key OPTIONAL  \!im\_serverity TYPE if\_abap\_behv\_message\=\>t\_severity OPTIONAL  \!im\_productid TYPE zi\_fso\_inventory\-ProductID OPTIONAL  \!im\_createby TYPE zi\_fso\_inventory\-CreatedBy OPTIONAL.   CONSTANTS:   BEGIN OF c\_product\_not\_exist,   msgid TYPE symsgid VALUE 'ZFSO\_INV', “ This is message id  msgno TYPE symsgno VALUE '001', “ This is message number  attr1 TYPE scx\_attrname VALUE 'PRODUCTID', “ Attr name of msg param  attr2 TYPE scx\_attrname VALUE '',   attr3 TYPE scx\_attrname VALUE '',   attr4 TYPE scx\_attrname VALUE '',   END OF c\_product\_not\_exist.   CONSTANTS:   BEGIN OF c\_only\_edit\_by\_owner,   msgid TYPE symsgid VALUE 'ZFSO\_INV',   msgno TYPE symsgno VALUE '008',   attr1 TYPE scx\_attrname VALUE 'CREATEBY',   attr2 TYPE scx\_attrname VALUE '',   attr3 TYPE scx\_attrname VALUE '',   attr4 TYPE scx\_attrname VALUE '',   END OF c\_only\_edit\_by\_owner.   DATA:   \!productid TYPE ZI\_Fso\_Inventory\-ProductID,   \!createby TYPE ZI\_Fso\_Inventory\-CreatedBy.   PROTECTED SECTION.   PRIVATE SECTION.  ENDCLASS.  CLASS ZCM\_FSO\_INVMSG IMPLEMENTATION.   METHOD constructor \#\#ADT\_SUPPRESS\_GENERATION.   CALL METHOD super\-\>constructor( ).   me\-\>if\_t100\_message\~t100key \= im\_textid.   me\-\>if\_abap\_behv\_message\~m\_severity \= im\_serverity.   IF im\_createby IS NOT INITIAL.   me\-\>createby \= im\_createby.   ENDIF.   IF im\_productid IS NOT INITIAL.   me\-\>productid \= im\_productid.   ENDIF.   ENDMETHOD.  ENDCLASS. |
| :---- |

Page 40 of 46  
Copyright © 2023 FPT All Rights Reserved. 

• Sample of message use. 

| " Reject input data  APPEND VALUE \#( %tky \= ls\_inventory\-%tky ) TO failed\-inventory. " Raise message  APPEND VALUE \#(    %tky \= ls\_inventory\-%tky   %msg \= NEW ZCM\_FSO\_INVMSG(   im\_textid \= ZCM\_FSO\_INVMSG\=\>C\_ONLY\_EDIT\_BY\_OWNER   im\_serverity \= if\_abap\_behv\_message\=\>severity\-error  im\_createby \= ls\_inventory\-CreatedBy ) ) TO reported\-inventory. |
| :---- |

**7.2.3.2** Show messages in Validations with Draft and without Draft 

• %state\_area must be clear before displaying messages 

• %state\_area must be set if you are showing validation messages in Draft-scenarios. 

• %element-\<field\_name\> should be set with if\_abap\_behv=\>mk-on, so that user can just  click on the message to go to the incorrect field 

For example: 

| " Clear state message  APPEND VALUE \#( %tky \= ls\_inventory\-%tky   %state\_area \= 'PRODUCTID' ) TO reported\-inventory.  " Reject input data  APPEND VALUE \#( %tky \= ls\_inventory\-%tky ) TO failed\-inventory.  " Raise messages  APPEND VALUE \#(    %tky \= ls\_inventory\-%tky   %msg \= NEW zcm\_fso\_invmsg (   im\_textid \= zcm\_fso\_invmsg\=\>c\_product\_not\_exist  im\_serverity \= if\_abap\_behv\_message\=\>severity\-error  im\_productid \= ls\_inventory\-ProductID )   %element\-ProductID \= if\_abap\_behv\=\>mk\-on   %state\_area \= 'PRODUCTID' ) TO reported-inventory. |
| :---- |

**7.2.4** Passing Parameter to RAP Actions. 

Following steps below to pass data to parameter in RAP Actions.  

You can also use this to create Popup for RAP Action in Fiori Element. 

• STEP1: Create an ABSTRACT ENTITY.

| @EndUserText.label: 'Param change data SO' |
| :---- |

Page 41 of 46   
Copyright © 2023 FPT All Rights Reserved. 

| define abstract entity ZD\_PARAM\_CHANGE\_DATA\_SO {  pricing\_data : *abap*.*char*( 8 );  } |
| :---- |

• STEP2: Create ACTION that use ABSTRACT ENTITY as parameters. 

| action UpdateData parameter ZD\_PARAM\_CHANGE\_DATA\_SO result \[1\] $self; |
| :---- |

• STEP3: Implement that ACTION in Behavior Pool. 

| METHODS UpdateData FOR MODIFY  IMPORTING it\_keys FOR ACTION ZCR\_SalesOrder\~UpdateDate RESULT result. ……  METHOD UpdateData.  \* Process data  LOOP AT it\_keys ASSIGNING FIELD-SYMBOL(\<lfs\_keys\>).  (update data using values from \<lfs\_keys\>\-%param)  ENDLOOP.  ENDMETHOD. |
| :---- |

**7.2.5** Using Virtual Elements in CDS Projection Views 

Virtual elements are used if field elements are not provided as part of the original persistence data  model but can be calculated using ABAP. 

They are defined at the level of CDS projection views as additional elements within the SELECT  list. 

Add the interface IF\_SADL\_EXIT\_CALC\_ELEMENT\_READ to the public section of your  calculation class and add the two method implementations

| CLASS ZCL\_DAYS\_TO\_FLIGHT DEFINITION   PUBLIC   FINAL   CREATE PUBLIC .   PUBLIC SECTION.   INTERFACES if\_sadl\_exit\_calc\_element\_read.   PROTECTED SECTION.   PRIVATE SECTION.  ENDCLASS.  CLASS ZCL\_DAYS\_TO\_FLIGHT IMPLEMENTATION. |
| :---- |

Page 42 of 46   
Copyright © 2023 FPT All Rights Reserved. 

|  METHOD if\_sadl\_exit\_calc\_element\_read\~get\_calculation\_info. IF iv\_entity \<\> 'ZC\_BOOKING'.  RAISE EXCEPTION TYPE /dmo/cx\_virtual\_elements   EXPORTING  textid \= zcx\_virtual\_elements=\>entity\_not\_known  entity \= iv\_entity.  ENDIF.  LOOP AT it\_requested\_calc\_elements ASSIGNING field  symbol(\<fs\_calc\_element\>).   CASE \<fs\_calc\_element\>.   WHEN 'DAYSTOFLIGHT'.  APPEND 'FLIGHTDATE' TO et\_requested\_orig\_elements.  \* WHEN 'ANOTHERELEMENT'.  \* APPEND '' ...   WHEN OTHERS.  RAISE EXCEPTION TYPE zcx\_virtual\_elements  EXPORTING   textid \= zcx\_virtual\_elements=\>ve\_not\_known   element \= \<fs\_calc\_element\>   entity \= iv\_entity.   ENDCASE.  ENDLOOP.   ENDMETHOD.   METHOD if\_sadl\_exit\_calc\_element\_read\~calculate.   DATA(lv\_today) \= cl\_abap\_context\_info=\>get\_system\_date( ).  DATA lt\_original\_data TYPE STANDARD TABLE OF zc\_booking\_proc  WITH DEFAULT KEY.  lt\_original\_data \= CORRESPONDING \#( it\_original\_data ).   LOOP AT lt\_original\_data ASSIGNING FIELD-SYMBOL(\<fs\_original\_data\>).  \<fs\_original\_data\>-DaysToFlight \= \<fs\_original\_data\>-FlightDate \-  lv\_today.  ENDLOOP.   ct\_calculated\_data \= CORRESPONDING \#( lt\_original\_data ).  ENDMETHOD.  ENDCLASS. |
| ----- |

**7.2.6** RAP Custom Entity and Queries 

Use cases for unmanaged queries are 

• The data source for an OData request is not a database table, but, for example another  OData service, which is reached by an OData client proxy, 

• Performance optimization with application specific handling, 

• Using AMDPs with some query push-down parameters in the SQL script implementation, • Forwarding the call to the analytical engines, or 

• Enrichment of query result data on property or row level, for example when splitting rows  for intermediate sums or condensing the filter result.

Page 43 of 46   
Copyright © 2023 FPT All Rights Reserved. 

For example: 

**Custom Entity** ZI\_TRAVEL\_UQ 

| @EndUserText.label: 'Custom entity for unmanaged travel query' @ObjectModel.query.implementedBy:'ABAP: ZCL\_TRAVEL\_UQ'  define custom entity ZI\_TRAVEL\_UQ  {   key Travel\_ID : abap.numc( 8 );   Agency\_ID : abap.numc( 6 );   Customer\_ID : abap.numc( 6 );   Begin\_Date : abap.dats;   End\_Date : abap.dats;   Booking\_Fee : abap.dec( 17, 3 );   Total\_Price : abap.dec( 17, 3 );   Currency\_Code : abap.cuky;   Status : abap.char( 1 );   LastChangedAt : timestampl;  } |
| :---- |

**Sample Implementation** ZCL\_TRAVEL\_UQ

| CLASS ZCL\_TRAVEL\_UQ DEFINITION PUBLIC  FINAL  CREATE PUBLIC .   PUBLIC SECTION.   INTERFACES if\_rap\_query\_provider.   PROTECTED SECTION.   PRIVATE SECTION.  ENDCLASS.  CLASS zcl\_travel\_uq IMPLEMENTATION.   METHOD if\_rap\_query\_provider\~select.   TRY.   CASE io\_request\-\>get\_entity\_id( ).   WHEN 'ZI\_TRAVEL\_UQ'.  \*\*query implementation for travel entity filter   DATA(lv\_sql\_filter) \= io\_request\-\>get\_filter( )-\>get\_as\_sql\_string( ).  TRY.   DATA(lt\_filter) \= io\_request\-\>get\_filter( )-\>get\_as\_ranges( ).  CATCH cx\_rap\_query\_filter\_no\_range.   "handle exception   ENDTRY.  \*\*CDS parameters   DATA(lt\_parameters) \= io\_request\-\>get\_parameters( ).   DATA(lv\_next\_year) \= CONV syst\_datum( cl\_abap\_context\_info\=\>get\_system\_date( ) \+ 365 ).  DATA(lv\_par\_filter) \= | BEGIN\_DATE \>= '{ cl\_abap\_dyn\_prg\=\>escape\_quotes(   VALUE \#( lt\_parameters\[ parameter\_name \= 'P\_START\_DATE' \]-value  DEFAULT cl\_abap\_context\_info\=\>get\_system\_date( ) ) ) }'| && | AND | &&  | END\_DATE \<= '{ cl\_abap\_dyn\_prg\=\>escape\_quotes(    VALUE \#( lt\_parameters\[ parameter\_name \= 'P\_END\_DATE' \]-value  DEFAULT lv\_next\_year ) ) }'| .   IF lv\_sql\_filter IS INITIAL.   lv\_sql\_filter \= lv\_par\_filter.   ELSE.   lv\_sql\_filter \= |({ lv\_sql\_filter } AND { lv\_par\_filter } )| .   ENDIF.  \*\*Build SQL search   DATA(lv\_search\_string) \= io\_request\-\>get\_search\_expression( ).   DATA(lv\_search\_sql) \= |DESCRIPTION LIKE    '%{ cl\_abap\_dyn\_prg\=\>escape\_quotes( lv\_search\_string ) }%'|.  IF lv\_sql\_filter IS INITIAL.   lv\_sql\_filter \= lv\_search\_sql.   ELSE. |
| :---- |

Page 44 of 46   
Copyright © 2023 FPT All Rights Reserved. 

|  lv\_sql\_filter \= |( { lv\_sql\_filter } AND { lv\_search\_sql } )|.  ENDIF.  \*\*request data   IF io\_request\-\>is\_data\_requested( ).  \*\*Sample paging   DATA(lv\_offset) \= io\_request\-\>get\_paging( )-\>get\_offset( ).   DATA(lv\_page\_size) \= io\_request\-\>get\_paging( )-\>get\_page\_size( ).  DATA(lv\_max\_rows) \=    COND \#( WHEN lv\_page\_size \= if\_rap\_query\_paging\=\>page\_size\_unlimited  THEN 0 ELSE lv\_page\_size ).  \*\*Sample sorting   DATA(sort\_elements) \= io\_request\-\>get\_sort\_elements( ).   DATA(lt\_sort\_criteria) \= VALUE string\_table(    FOR sort\_element IN sort\_elements   ( sort\_element\-element\_name &&    COND \#( WHEN sort\_element\-descending \= abap\_true THEN \`descending\`  ELSE \` ascending\` ) ) ).   DATA(lv\_sort\_string) \=    COND \#( WHEN lt\_sort\_criteria IS INITIAL THEN \`primary key\`  ELSE concat\_lines\_of( table \= lt\_sort\_criteria sep \= \`, \` ) ). \*\*requested elements   DATA(lt\_req\_elements) \= io\_request\-\>get\_requested\_elements( ).  \*\*Sample aggregate   DATA(lt\_aggr\_element) \= io\_request\-\>get\_aggregation( )-\>get\_aggregated\_elements( ).  IF lt\_aggr\_element IS NOT INITIAL.   LOOP AT lt\_aggr\_element ASSIGNING FIELD-SYMBOL(\<fs\_aggr\_element\>).  DELETE lt\_req\_elements WHERE table\_line \= \<fs\_aggr\_element\>-result\_element.  DATA(lv\_aggregation) \= |{ \<fs\_aggr\_element\>\-  aggregation\_method }( { \<fs\_aggr\_element\>\-input\_element } ) as { \<fs\_aggr\_element\>\- result\_element }|.   APPEND lv\_aggregation TO lt\_req\_elements.   ENDLOOP.   ENDIF.   DATA(lv\_req\_elements) \= concat\_lines\_of( table \= lt\_req\_elements  sep \= \`, \` ).  \*\*\*\* Sample grouping   DATA(lt\_grouped\_element) \= io\_request\-\>get\_aggregation( )-\>get\_grouped\_elements( ).  DATA(lv\_grouping) \= concat\_lines\_of( table \= lt\_grouped\_element  sep \= \`, \` ).  \*\*select data   DATA lt\_travel\_response TYPE STANDARD TABLE OF zi\_travel\_uq.   SELECT (lv\_req\_elements) FROM ztravel   WHERE (lv\_sql\_filter)   GROUP BY (lv\_grouping)   ORDER BY (lv\_sort\_string)   INTO CORRESPONDING FIELDS OF TABLE @lt\_travel\_response   OFFSET @lv\_offset UP TO @lv\_max\_rows ROWS.  \*\*fill response   io\_response\-\>set\_data( lt\_travel\_response ).   ENDIF.  \*\*request count   IF io\_request\-\>is\_total\_numb\_of\_rec\_requested( ).  \*\*select count   SELECT COUNT( \* ) FROM ztravel   WHERE (lv\_sql\_filter)   INTO @DATA(lv\_travel\_count).  \*\*fill response   io\_response\-\>set\_total\_number\_of\_records( lv\_travel\_count ).   ENDIF.   WHEN \`ZI\_BOOKING\_UQ\`.  \*\*query implementation for booking entity   ENDCASE.   CATCH cx\_rap\_query\_provider.   ENDTRY.   ENDMETHOD.  ENDCLASS. |
| :---- |

Page 45 of 46  
Copyright © 2023 FPT All Rights Reserved. 

**7.2.7** Other RAP Guidelines form Standard Document of SAP 

Reference: https://help.sap.com/doc/3750bcdf7b8045e18f1b759e6d2b000b/Cloud/en US/ABAP\_RESTful\_Programming\_Model\_EN.pdf

Page 46 of 46   
Copyright © 2023 FPT All Rights Reserved. 

[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAAA8CAYAAAA9vgdnAAAO2UlEQVR4Xu2beXRUdZbH+XNsuo99zszYy/Qog7T7cvqMbTu4zcFmkSQgCtoLqMioTTsEcFi6wbbBRtlERYkgLU0WCKAsgwoJYTFkIPtKyB5IQlJF9trr1at6lTv3fl+9Si3pUNBp5szp+uV8TtWrt97v7/7u7973XkbR/0Hz+31AU12knssB7vSF5Fg1nhxL7wbOpXf9Ge4EDv7uqfiKNL8XjEQbFfnDX7MN8J9/wE++vg7g3PYi2ReNBY7kMWRb+C/8GUC+D4GdtxNsC8eRr6OOBvh4wki0uBgh7fqKMTBAPkcfOd97CuiG3QIcC8fEhCGG663HaUCxR57iL2rXXQz34fVX7P1hMfb9eDYN+EfGI4x2RTHEtcUIA5LP4J+sHx5/yL5+j4PsS+8hu/TwEL0eC4ZnKCe2Ba5HP5F+aXKekO90ZbGCtvBQi4th/MUihubX6HxLH/jtjmJ6bPFRumvefnDnSwf4cxhe2k///voR6rMrQK0/wyKMDRoUaWhMyH6MWns6rJM0TaNmayN9WvsJWJyfTPNyn6d5p18Ylrm5c8Da8jVDi2GcQPVqtOmzSvrOs5nghqRU+kZSOt2QGCApDcvDMfG32eTlCxWUnBTdmMg4cBU4/+sOoNm70FGqTwWfNe6lmcefosSsySDp6GRKwPdJw5KQ9QTYXrs1WgxdCH26Wrenkr45jY1KTAOj2birggV7Y2cJ95oXuHb8KiDGNcL7OtdPAZrXzQJ7KbMxAyRmTQkIIZ+xMy3AKdOJuBjDiiFjr6SxC3x7BguRcA0ihIiRVdxGGucDgmP1+GseJnb55H3de5YD6bTa/hqakZMEIo2Mlad5X6HN3hYthl/zU3JKPjA84ptJOv/wzO4r8vfM6KQM8I8zd1Nbl5V8ve3AvmgccC65MyYci384mFcw9gU8i5zJAJJjbD73Ho93GfeTaHp2As04xoYdmzYMSTQ9KwEYsWXuyTlA0ZRoMXw+H93/6iHwjcSd9PDCL+l0tRm0mG3DctFkpbyqy3QjDy3hId7X7eEAV/wFgJvveJm8Pa1A6/3z+Hi9x1xPLk7ZBWSqC28ltb0aeDQPzc97mQPlFPBVy3+T2dHBmIahg1qsrWBZ4VJKYs94q/xNIGVCXIzhxLDYPTR6Wgb451/spSY2UKYwoOn42UUNZNmn+YC530Uzfp/DIkrQTadXNhfwNjz9HV4LxCAldwcfywdknZ/Lb2EggMbH0dEQF7yNBcAqsWbJPRw4FdBma6Vnjk2nRJ5ChZTzH/EU64k4tly3vhxJaXcxi/EkZTSmAf+AFi3GlwWtbEgqmLoiGzua+hUwcVkWTVwuZIcxYfkx8P1nd3HAHcxDdh2vZ6NUcm1MBCKGJF6GuOrRjeT+YCZQPpgFnAHceRl6rlObC+wLbiHn1tlB4fM6T0cEw8n0Wt58Wln0G3C45TDHP41qLDVgReB3g+Szr1FS9pNU3VsFhvSMNbsreBZIA3/YVYFeO1nWAh5dfIQeez2cRxd/RWPn7AWGRxgBt1G8ytZFjjceBLbF48jvtrMxKnCmLuRpMkFnQ6LOugSgVGVBMM/R94CDhXR/sT54Yyil+sNAEIyYIQKe8rX5FDwjrW4nMALmIFPoZyeeJrPLDIZMx//mxTCKFR9Pq9PePI7cQvgivxUnlt8FTWJEKOyGHq+Xpq7MBjI0RIxxz38OFNVL3gslyBEE51uPseuKMXq88XIarfm8wK/paPhNxOJ9ObFyvP80kJrGcy6bfNw5gtQe0WJMxvQqXLBdwDWuKnsDRG4rwXNR/mvBGCJDUhcjUItYHArdNnc/3Tg9DbR1OdhgP9lcHmBxesjqlE8FtHVZ6PVthewF4g1Si4hHpdPP3z4FJOv0nE4l28KbgSs9GecxDNZcVvIbuHU0lwWo/R3k3PMbTrjG6iy9m3xdzdSv9IFZOUYdEi7GS18/D1xeJ2eoKv3ixCwQve0U+oDzFNJLXIyKMDHOt/bRt3hK/NGrB4FDUanPqtCYOZ8BI7M0hsPfTZVAG511vn+gGojirp3JZEseC5TjWxGo1LOZwJF8s56RgkBilRwo0xfI3S9Z1nGueYJnEQ+Vd5eCaRz8Ig2UKfbNkpVgwD9A7Y52TrUng0ghJFE70Z4dFyMmMdJzGnjcp9LstaeBDJHShi42UuoTQdLsQTEMQkX6Fg+vM5ygCRIDHG//lJzs5oK3LhdB0ZW5HOCeRki6HQWLYUvWcaUuwL67GtIAAmWUGJM4Z0gHEpNOXjoR2EaCargYkmNcsDYFbR8Ug1UUklMKMIu8f7AayMnX7amgWKtW2eZ7s3ZzXFGAt+si2eQ5yJI7gGbpIJ/iIOc7E0FUVToUcrNYkrVT2+Fpq0pXgsieRm8fnUglnEwJEoA3Vq6N2sbgxa9nk121RYvhYxWFRxZ9id49UtQCMk820PeezQxOtZHGRyJi/JSTL2O2kbtRYpBt1XjgtZjJuXsZejxWjGHibS4mhWeXn+XMBJHGCTKLNFkawMHmz+mp7KlR2xisKFqGWSlqmMTFCIghLtLe7QQ/4FpkdEIa3cSlt3BDjMMjVIyVfyoKzt3KoTUIjvbFtwPb67eFGRhp+JCseBB4OXlrsNZhrAuRxglyk+YZLtWFJIkTRyIDZyB2MJlNuxFXwoaJFCinq0xgNGqSaCNj5aZZmXSupYcV9wFXyhyKigFXiVGriLiHLh5AsiREChFmcBiD6+Se6IycRNBubydJN0MbxHh3fxW4Gi8wCE2//8CpPCpb1Q0cy+6hqJ6OFfGcBWPIfWA1EDE2VL4zhPGxIlOseEQGkJtYPTaFMnKaQbPZGhcjTAyZPo30WRKmWAjNMb49I4N+n14GpBbBPY6OWmBfdGu0kTFiJF9q6RfA5XXRr3JfhlGR7j88+vYSXFPrd5DH5wFSxO062URvphaDtXsraZSbC6275u4DoxN3xkAq3TpnD3hx49dUWNcVFoTk03MmE0iyFGlkrIgQNk7UfN0XQbujjWZmTaPpWVOHZRoHVyGB+eWpn9OmyvWgtr8WHWU0GRHZJZc44JeAT7Pq2TPYrXtt7piRJ2NujxcY1achho6f3FxgCXjF4FphMVxrJvBwcwJ5LGBVLWRTrTFiI8WnBK9RPCH01QW8GsEVdJ/DDVSfLy5GmBjBtSPQIIaqBm/U2Llsj5wqrwbleAqMEK5HG3Ex/M4+si+5C1zLA6PgjaBN00lTnOjNkXoz50ptRMWQoKTW5Mb8ykHoNk6ZPThg2rb8Enj7TXBlw82vR4uLEdJGWAw/eXJ3kHP5fQHuvwL3kWvFj4Hzw+fIU7CXfB43EGGvdxtRMWRsy91vv607djjGCANyQzgQH3TC64br0UZUjP/vLS5GSIuLEdLiYoS0uBghLS5GSBvl1biw4jJe8Hh9pHjl2aq8c6G/HxHZ5CVXo14ILd2xLlAQubk+EeyKjwsgTd9niGMhfffrdDk8tKvMTJ12N8BrC4Epdqjr+Gu0UZUmCz2SUgIeTimlh1LK6WitGcizlNA3fJFHsMGHqi+Dtn5Fv9AAIkReaz89vKUM3PluMS050hC8+w7DxcDAcxrBeN8iMbWK5h+so3arG2SUm6nPJTdhQitjf1BYLbBsXJssh12rnEv+jP3lfAPSgTrB6wjJa0blt1nogQ+LQa9TetML7xCaexx0tqWfzl+2A5Uvuot77d+2lILd5SayuNXgBajsZRO2FtP2onbg8nj0Xg688WNXPFTYZqOaTjtQ+TeT1QluWpVLWXW9VNdpA/duKqJTTb3U0ucAJpsLb/RctjmByeqC93Rx+S20W5zU41Co6JIVFLNdTj6/lOZCvdjSaqFO3kZQeCSUtVuorMMKPFLCx8WIEONfNxeDVnZ7s8XFB/WAOzYU0H/sr6PJ28vAiqxGOtbYQ2PWFoDnMqqpqqM/KIbEmek7K+jX7O6CXJw85nN4VJD4p3J6YW81TdhWBj4800b7q7vAjb/Loxf2nKcPzrSDf1pzhubtPU8p+Sbwyv4aiPHrQ/XguV3n8Dhi6dFm8HG+7NdGvzt2Ebz0WS3N3ifXZwO3bcin+QfqSMKCMO/zGnqVbZvLxxX+81CtLsZNb+WBRz4uo0e3VVJjtwvctqGQWntd3LsKuPnts3TZ7qEnPikDBay0NuALvuwiT9Gaex2UuLMK/Oj9IvqyppO+qu0GE7ZXkJcNKuUeEe59N597zwu+u/p/qLHHSU5FAQ9sLmFvcFNDtx08xJ7Y73bT4yyiMOGTcvYGFz36cSkQT1O8KtVctoHdFWYau/YsFbVZwYMfFbOHeKmWtxMkPprZ2yo7LOCWd/J1MX7yUQlwc+SXl0372fWF2zcU0SWLm0+igbHrC6ih00VPbC8HhXySyEgvy8aL8xmlbXT3pkLamNsK5nFvyXojSN6zqYBdXAXfWZ3HQrqC4jzAnmqyq8FHlVN3VFAmB9Xn99UCCbZpJSaIJMiwns2e9cr+arDl7CX23nweLjJkrGxfGYbxiaYeMG7tGXrtcAMtO9IEUgouxcUIE0OCyoN8MMHNQYTVCIoxjo0X18272Adu53Fn498nsRDC5+c6yaUODhOZrhq7OdhZFXCwupMNLqTs+h5w73tFCNIHqrvB+C0lCFzCd1efpiYWw8FBT/jx5iIOeFa4tvAuiynDLrXUBI7y8e7n5RVZzaDfpdIdGwu581ygx+2hH67LDw6Tn3xUyufReGgo4L5NJVTHw09+EyTPGVVlsnKgqQHwDO65fpcX/GDNWZr4xwp68lOd7Ppu3KXeUdwBxm+tpHwWyRBDZof5B2poPOcswuNby2lf5WVO5lSw7lQzPGoyH0vIu9gbzDMkBrWxEV4WRnj7RDM9trWMOmweUGmy0cO8bHhVO89Ack0StwTxxNXHL9BTaVXg2V3VNCO9is6Z7WD2vvOYVYyXbjM4psg1TP20EszjIIqn8EYiY8wKFhZCuH19Ec8w7mCWaKwfnEoD32V4BIaIHMepasDIYgeRbJeHELu9ELpOQ94W/pu4dei+eqI1uBz2L1+BT6OnnR7fEOvDjy/Zt3Gtsj4uRqgYYdEv0GxcUwiTeCo0s4v+rbT/Bb5c6fkZgD7QAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,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>

[image5]: <data:image/png;base64,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>

[image6]: <data:image/png;base64,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>

[image7]: <data:image/png;base64,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>

[image8]: <data:image/png;base64,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>

[image9]: <data:image/png;base64,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>

[image10]: <data:image/png;base64,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>

[image11]: <data:image/png;base64,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>

[image12]: <data:image/png;base64,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>

[image13]: <data:image/png;base64,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>

[image14]: <data:image/png;base64,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>

[image15]: <data:image/png;base64,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>