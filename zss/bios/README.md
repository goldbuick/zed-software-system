# What is tape?

A collection of baseline software for ZSS.
Enough of a toolset for people to produce their own software.

----
how do codepages work?

you start typing and it figures out the content type you want
defaults to object typedef

@code name
' rest of code goes here
' note this is for use with func

@board name
' rest of board code goes here
' ie: after typing out @board:barftown
' you can now launch a boardedit for barftown

@object name
@name ' object: scope is optional
' rest of object code goes here
' ie: after typing out @object ripper
' you can now launch an objectedit for ripper

@terrain name
' rest of terrain code goes here
' ie: after typing out @terrain endlesspit
' you can now launch a terrainedit for endlesspit

@charset name
' rest of charset code goes here

@palette name
' rest of palette code goes here
